import type {
  Entity,
  Prisma,
  PrismaClient,
  Role,
  User,
  WikiPage,
} from "@sam-monorepo/database/client";
import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageSidebarMode,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { randomUUID } from "node:crypto";

/**
 * The base permission every signed-in user needs to get past the clearance
 * gate (see requireAuthenticationPage).
 */
export const LOGIN_PERMISSION = "login;manage";

export interface Citizen {
  readonly user: User;
  readonly entity: Entity;
  readonly role: Role;
}

interface CreateCitizenOptions {
  readonly handle: string;
  /** Additional permission strings on top of the login permission. */
  readonly permissionStrings?: readonly string[];
  /** Grants the all-permissions override once enableAdminMode() is used. */
  readonly admin?: boolean;
}

/**
 * A fully sign-in-able user: the session callback resolves the Entity via
 * the Discord account's providerAccountId and builds permissions from the
 * assigned roles.
 */
export const createCitizen = async (
  prisma: PrismaClient,
  { handle, permissionStrings = [], admin = false }: CreateCitizenOptions,
): Promise<Citizen> => {
  const suffix = randomUUID().slice(0, 8);
  const discordId = randomUUID();

  const user = await prisma.user.create({
    data: {
      name: handle,
      email: `${handle}-${suffix}@example.com`,
      emailVerified: new Date(),
      role: admin ? "admin" : null,
      accounts: {
        create: {
          type: "oauth",
          provider: "discord",
          providerAccountId: discordId,
        },
      },
    },
  });

  const entity = await prisma.entity.create({
    data: {
      discordId,
      handle,
      createdById: user.id,
    },
  });

  const role = await createRole(prisma, {
    name: `${handle}-role-${suffix}`,
    permissionStrings: [LOGIN_PERMISSION, ...permissionStrings],
  });
  await assignRole(prisma, entity, role);

  return { user, entity, role };
};

interface CreateRoleOptions {
  readonly name?: string;
  readonly permissionStrings?: readonly string[];
}

export const createRole = async (
  prisma: PrismaClient,
  { name, permissionStrings = [] }: CreateRoleOptions = {},
) =>
  prisma.role.create({
    data: {
      name: name ?? `role-${randomUUID().slice(0, 8)}`,
      permissionStrings: {
        create: permissionStrings.map((permissionString) => ({
          permissionString,
        })),
      },
    },
  });

export const assignRole = (
  prisma: PrismaClient,
  entity: Pick<Entity, "id">,
  role: Pick<Role, "id">,
) =>
  prisma.roleAssignment.create({
    data: {
      citizenId: entity.id,
      roleId: role.id,
    },
  });

interface TiptapNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly TiptapNode[];
  readonly text?: string;
}

export const wikiParagraph = (text: string): TiptapNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

export const wikiHeading = (level: number, text: string): TiptapNode => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

export const wikiDocument = (...blocks: readonly TiptapNode[]): TiptapNode => ({
  type: "doc",
  content: blocks,
});

const extractText = (node: TiptapNode): string =>
  [node.text ?? "", ...(node.content ?? []).map(extractText)]
    .filter(Boolean)
    .join(" ");

interface CreateWikiPageOptions {
  readonly title: string;
  readonly parentId?: string;
  readonly visibility?: WikiPageVisibility;
  readonly editability?: WikiPageEditability;
  readonly sidebarMode?: WikiPageSidebarMode;
  /** Tiptap JSON, see wikiDocument()/wikiParagraph()/wikiHeading() */
  readonly content?: TiptapNode;
  readonly ownerId?: string;
  readonly sortOrder?: number;
  readonly roleAccess?: readonly {
    readonly roleId: string;
    readonly type: WikiPageAccessType;
  }[];
}

export const createWikiPage = (
  prisma: PrismaClient,
  {
    title,
    parentId,
    visibility = WikiPageVisibility.INHERIT,
    editability = WikiPageEditability.INHERIT,
    sidebarMode = WikiPageSidebarMode.VISIBLE,
    content,
    ownerId,
    sortOrder = 0,
    roleAccess = [],
  }: CreateWikiPageOptions,
) =>
  prisma.wikiPage.create({
    data: {
      title,
      // Cosmetic only — pages are resolved by id
      slug: title
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, ""),
      parentId,
      visibility,
      editability,
      sidebarMode,
      content: content ? JSON.parse(JSON.stringify(content)) : undefined,
      searchText: content ? extractText(content) : "",
      ownerId,
      sortOrder,
      roleAccess: {
        create: roleAccess.map(({ roleId, type }) => ({ roleId, type })),
      },
    },
  });

export const createWikiTag = async (
  prisma: PrismaClient,
  page: Pick<WikiPage, "id">,
  name: string,
) => {
  const tag = await prisma.wikiTag.create({
    data: {
      name,
      pages: {
        create: {
          pageId: page.id,
        },
      },
    },
  });

  // tagsText is denormalized for the full-text search index and normally
  // kept in sync by updateWikiPageTags
  const assignments = await prisma.wikiPageTag.findMany({
    where: { pageId: page.id },
    include: { tag: true },
  });
  await prisma.wikiPage.update({
    where: { id: page.id },
    data: {
      tagsText: assignments.map((assignment) => assignment.tag.name).join(" "),
    },
  });

  return tag;
};

interface CreateOnSiteNotificationOptions {
  readonly citizenId: string;
  readonly notificationType?: string;
  readonly payload?: Prisma.InputJsonValue;
  readonly payloadVersion?: number;
  readonly createdAt?: Date;
  readonly readAt?: Date | null;
  readonly archivedAt?: Date | null;
}

export const createOnSiteNotification = (
  prisma: PrismaClient,
  {
    citizenId,
    notificationType = "event_created",
    payload = { eventId: "test-event", eventName: "Operation Testlauf" },
    payloadVersion = 1,
    createdAt,
    readAt = null,
    archivedAt = null,
  }: CreateOnSiteNotificationOptions,
) =>
  prisma.onSiteNotification.create({
    data: {
      citizenId,
      notificationType,
      payload,
      payloadVersion,
      createdAt,
      readAt,
      archivedAt,
    },
  });

export const WIKI_SETTING_FEATURED_PAGES = "featuredPages";

export const setWikiFeaturedPages = (
  prisma: PrismaClient,
  pageIds: readonly string[],
) =>
  prisma.wikiSetting.upsert({
    where: { key: WIKI_SETTING_FEATURED_PAGES },
    create: { key: WIKI_SETTING_FEATURED_PAGES, value: [...pageIds] },
    update: { value: [...pageIds] },
  });

export {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageSidebarMode,
  WikiPageVisibility,
};
