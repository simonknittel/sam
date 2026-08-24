import type {
  Entity,
  EventDiscordPublishTarget,
  Prisma,
  PrismaClient,
  Role,
  User,
  VariantStatus,
  WikiPage,
} from "@sam-monorepo/database/client";
import {
  EventSource,
  EventTemplateAccessType,
  EventVisibility,
  FlowNodeMarkdownPosition,
  FlowNodeType,
  FlowRoleAccessType,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageEventScope,
  WikiPageNamespace,
  WikiPageSidebarMode,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { randomBytes, randomUUID } from "node:crypto";

export const ONE_MINUTE_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Start and end of an event far enough ahead that sign-up is still open,
 * spread for createAppEvent()/createEventTemplate() call sites.
 */
export const futureEvent = () => ({
  startTime: new Date(Date.now() + ONE_DAY_MS),
  endTime: new Date(Date.now() + ONE_DAY_MS + 2 * ONE_HOUR_MS),
});

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

export const WIKI_SETTING_DASHBOARD_PAGE = "dashboardPage";

export const setWikiDashboardPage = (prisma: PrismaClient, pageId: string) =>
  prisma.wikiSetting.upsert({
    where: { key: WIKI_SETTING_DASHBOARD_PAGE },
    create: { key: WIKI_SETTING_DASHBOARD_PAGE, value: pageId },
    update: { value: pageId },
  });

interface CreateSilcTransactionOptions {
  readonly receiverId: string;
  readonly value: number;
  readonly description?: string;
  readonly createdById?: string;
}

/**
 * Creates a transaction and keeps the denormalized balance columns on
 * Entity in sync the way the app's updateCitizensSilcBalances does
 * (totalEarnedSilc only counts positive values).
 */
export const createSilcTransaction = async (
  prisma: PrismaClient,
  { receiverId, value, description, createdById }: CreateSilcTransactionOptions,
) => {
  const transaction = await prisma.silcTransaction.create({
    data: { receiverId, value, description, createdById },
  });

  await prisma.entity.update({
    where: { id: receiverId },
    data: {
      silcBalance: { increment: value },
      ...(value > 0 ? { totalEarnedSilc: { increment: value } } : {}),
    },
  });

  return transaction;
};

interface CreateEventOptions {
  readonly name: string;
  /** Discord id of the organizer — managing rights key off this. */
  readonly discordCreatorId: string;
  readonly startTime: Date;
  readonly lineupEnabled?: boolean;
  readonly location?: string;
}

/**
 * Discord-sourced events are only ever written by the Discord-scraping
 * lambda, so seeding them directly is the intended route in tests.
 * discordImage stays unset on purpose — it would make the page fetch from
 * the Discord CDN.
 */
export const createEvent = (
  prisma: PrismaClient,
  {
    name,
    discordCreatorId,
    startTime,
    lineupEnabled,
    location,
  }: CreateEventOptions,
) =>
  prisma.event.create({
    data: {
      source: EventSource.DISCORD,
      discordId: randomUUID(),
      discordCreatorId,
      name,
      startTime,
      lineupEnabled,
      location,
      discordGuildId: "playwright-guild",
    },
  });

interface CreateAppEventOptions {
  readonly name: string;
  /** Entity id of the creating citizen — managing rights key off this. */
  readonly createdById: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly description?: string;
  readonly lineupEnabled?: boolean;
  readonly visibility?: EventVisibility;
  readonly visibilityRoleIds?: readonly Role["id"][];
}

/**
 * An app-created event as the createEvent action writes it, including the
 * manager-scoped briefing root page it seeds.
 */
export const createAppEvent = (
  prisma: PrismaClient,
  {
    name,
    createdById,
    startTime,
    endTime,
    description,
    lineupEnabled,
    visibility = EventVisibility.PUBLIC,
    visibilityRoleIds = [],
  }: CreateAppEventOptions,
) =>
  prisma.event.create({
    data: {
      source: EventSource.APP,
      name,
      description,
      startTime,
      endTime,
      lineupEnabled,
      visibility,
      createdById,
      visibilityRoles: {
        create: visibilityRoleIds.map((roleId) => ({ roleId })),
      },
      wikiPages: {
        create: {
          namespace: WikiPageNamespace.EVENT,
          title: "BRIEFING",
          slug: "briefing",
          eventReadScope: WikiPageEventScope.MANAGERS,
          eventEditScope: WikiPageEventScope.MANAGERS,
          imageUploadability: WikiPageUploadability.RESTRICTED,
          attachmentUploadability: WikiPageUploadability.RESTRICTED,
          ownerId: createdById,
        },
      },
    },
  });

interface CreateParticipantOptions {
  readonly eventId: string;
  readonly citizen: Citizen;
  /**
   * APP mirrors an in-app sign-up (identified by the citizen id), DISCORD an
   * RSVP mirrored from Discord (identified by the Discord user id, with the
   * citizen id filled in once the Discord account is known).
   */
  readonly source?: EventSource;
  readonly comment?: string;
  /**
   * Cancels the participation the way the app does: the row stays as
   * history and gives up its `active…` claim on the event.
   */
  readonly cancelled?: boolean;
  /** Entity id of whoever cancelled; defaults to the participant themselves. */
  readonly cancelledById?: string;
  /**
   * Set to false for a Discord RSVP whose Discord account the app has not
   * matched to a citizen yet — such a row carries the Discord id alone.
   */
  readonly citizenResolved?: boolean;
}

/**
 * Attendance is written either by the Discord-scraping lambda or by the
 * app's own sign-up action, so seeding it directly is the intended route in
 * tests.
 */
export const createParticipant = (
  prisma: PrismaClient,
  {
    eventId,
    citizen,
    source = EventSource.DISCORD,
    comment,
    cancelled = false,
    cancelledById,
    citizenResolved = true,
  }: CreateParticipantOptions,
) => {
  const isDiscord = source === EventSource.DISCORD;
  const citizenId = citizenResolved ? citizen.entity.id : null;
  const discordUserId = isDiscord ? citizen.entity.discordId : null;

  return prisma.eventParticipant.create({
    data: {
      eventId,
      source,
      citizenId,
      discordUserId,
      activeCitizenId: cancelled ? null : citizenId,
      activeDiscordUserId: cancelled ? null : discordUserId,
      comment,
      ...(cancelled
        ? {
            cancelledAt: new Date(),
            cancelledById: cancelledById ?? citizen.entity.id,
          }
        : {}),
    },
  });
};

interface CreateProfitDistributionCycleOptions {
  readonly title: string;
  /** Entity id of the creating manager */
  readonly createdById: string;
  /** Defaults to two days out, i.e. the cycle is in its collection phase. */
  readonly collectionEndedAt?: Date;
}

export const createProfitDistributionCycle = (
  prisma: PrismaClient,
  {
    title,
    createdById,
    collectionEndedAt = new Date(Date.now() + 2 * ONE_DAY_MS),
  }: CreateProfitDistributionCycleOptions,
) =>
  prisma.profitDistributionCycle.create({
    data: { title, collectionEndedAt, createdById },
  });

interface CreateUploadOptions {
  readonly fileName: string;
  readonly mimeType: string;
  readonly size?: number;
  /** Links the upload as an attachment of that wiki page */
  readonly wikiPageId?: string;
}

/**
 * A row of the uploads table without an object in the bucket — enough for
 * everything that only lists or filters uploads. `Upload.fileName` is stored
 * URI-encoded, so seeded rows have to encode like the upload endpoints do;
 * the table decodes it for display again.
 */
export const createUpload = (
  prisma: PrismaClient,
  user: Pick<User, "id">,
  { fileName, mimeType, size = 1024, wikiPageId }: CreateUploadOptions,
) =>
  prisma.upload.create({
    data: {
      fileName: encodeURIComponent(fileName),
      mimeType,
      size,
      createdById: user.id,
      ...(wikiPageId ? { wikiPages: { connect: { id: wikiPageId } } } : {}),
    },
  });

interface CreateVariantOptions {
  readonly manufacturerName: string;
  readonly seriesName: string;
  readonly variantName: string;
  readonly status?: VariantStatus;
}

/**
 * Seeds the Manufacturer → Series → Variant chain a Ship hangs off of.
 * Manufacturer and Series names are globally unique, but every test starts
 * from a truncated database, so plain names are fine.
 */
export const createVariant = async (
  prisma: PrismaClient,
  { manufacturerName, seriesName, variantName, status }: CreateVariantOptions,
) => {
  const manufacturer = await prisma.manufacturer.create({
    data: { name: manufacturerName },
  });
  const series = await prisma.series.create({
    data: { name: seriesName, manufacturerId: manufacturer.id },
  });
  const variant = await prisma.variant.create({
    data: { name: variantName, seriesId: series.id, status },
  });

  return { manufacturer, series, variant };
};

/**
 * The id the app considers "the" organization, see
 * packages/domain/src/ORG_ID.ts. The org fleet only counts ships of its
 * active members.
 */
export const ORG_ID = "cm4wm57sw0001opxo2c8oq0o0";

export const addCitizenToOrganization = async (
  prisma: PrismaClient,
  citizen: Citizen,
) => {
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    create: {
      id: ORG_ID,
      name: "Playwright Org",
      spectrumId: "PLAYWRIGHTORG",
      createdById: citizen.entity.id,
    },
    update: {},
  });

  await prisma.activeOrganizationMembership.create({
    data: {
      organizationId: ORG_ID,
      citizenId: citizen.entity.id,
      type: OrganizationMembershipType.MAIN,
      visibility: OrganizationMembershipVisibility.PUBLIC,
    },
  });
};

const CUID2_LENGTH = 24;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const ALPHANUMERICS = `${LETTERS}0123456789`;

/**
 * Career node ids have to pass the update action's `z.cuid2()` check —
 * a seeded flow whose ids look different could never be saved again.
 */
const cuid2Like = () =>
  Array.from(randomBytes(CUID2_LENGTH), (byte, index) =>
    index === 0
      ? LETTERS[byte % LETTERS.length]
      : ALPHANUMERICS[byte % ALPHANUMERICS.length],
  ).join("");

interface CreateFlowOptions {
  readonly name: string;
  readonly slug: string;
  readonly position?: number;
  readonly roleAccess?: readonly {
    readonly roleId: string;
    readonly type: FlowRoleAccessType;
  }[];
  /**
   * Markdown nodes stacked in a column and connected top to bottom, so a
   * flow has something recognizable to render, copy and save again.
   */
  readonly markdownNodes?: readonly string[];
}

export const createFlow = async (
  prisma: PrismaClient,
  {
    name,
    slug,
    position = 0,
    roleAccess = [],
    markdownNodes = [],
  }: CreateFlowOptions,
) => {
  const flow = await prisma.flow.create({
    data: {
      name,
      slug,
      position,
      roleAccess: {
        create: roleAccess.map(({ roleId, type }) => ({ roleId, type })),
      },
    },
  });

  if (markdownNodes.length === 0) return flow;

  const nodeIds = markdownNodes.map(() => cuid2Like());

  await prisma.flowNode.createMany({
    data: markdownNodes.map((markdown, index) => ({
      id: nodeIds[index]!,
      flowId: flow.id,
      type: FlowNodeType.MARKDOWN,
      positionX: 0,
      positionY: index * 200,
      width: 300,
      height: 120,
      markdown,
      markdownPosition: FlowNodeMarkdownPosition.CENTER,
      // The update action's schema rejects nulls here, so a saved-again
      // flow needs real values
      backgroundColor: "#000000",
      backgroundTransparency: 0.5,
    })),
  });

  await prisma.flowEdge.createMany({
    data: nodeIds.slice(1).map((targetId, index) => ({
      id: cuid2Like(),
      type: "smoothstep",
      sourceId: nodeIds[index]!,
      sourceHandle: "bottom",
      targetId,
      targetHandle: "top",
    })),
  });

  return flow;
};

interface CreateEventTemplateOptions {
  readonly name: string;
  /** Entity id of the owner — every permission but `event;manage` keys off this */
  readonly ownedById: string;
  readonly description?: string;
  readonly visibility?: EventVisibility;
  readonly visibilityRoleIds?: readonly Role["id"][];
  readonly roleAccess?: readonly {
    readonly roleId: Role["id"];
    readonly type: EventTemplateAccessType;
  }[];
  readonly deletedAt?: Date;
  /** Top-level position names, in order */
  readonly positionNames?: readonly string[];
  /** Additional briefing pages under the seeded root */
  readonly briefingPageTitles?: readonly string[];
  /** Prefills the created event's Discord publishing */
  readonly discordPublishTarget?: EventDiscordPublishTarget;
  readonly discordPublishChannelId?: string;
  readonly discordPublishLocation?: string;
}

/**
 * An event template as the createEventTemplate action writes it, including
 * the manager-scoped briefing root page it seeds.
 */
export const createEventTemplate = async (
  prisma: PrismaClient,
  {
    name,
    ownedById,
    description,
    visibility = EventVisibility.PUBLIC,
    visibilityRoleIds = [],
    roleAccess = [],
    deletedAt,
    positionNames = [],
    briefingPageTitles = [],
    discordPublishTarget,
    discordPublishChannelId,
    discordPublishLocation,
  }: CreateEventTemplateOptions,
) => {
  const template = await prisma.eventTemplate.create({
    data: {
      name,
      description,
      visibility,
      deletedAt,
      discordPublishTarget,
      discordPublishChannelId,
      discordPublishLocation,
      createdById: ownedById,
      updatedById: ownedById,
      ownedById,
      visibilityRoles: {
        create: visibilityRoleIds.map((roleId) => ({ roleId })),
      },
      roleAccess: {
        create: roleAccess.map(({ roleId, type }) => ({ roleId, type })),
      },
      wikiPages: {
        create: {
          namespace: WikiPageNamespace.EVENT,
          title: "BRIEFING",
          slug: "briefing",
          eventReadScope: WikiPageEventScope.MANAGERS,
          eventEditScope: WikiPageEventScope.MANAGERS,
          imageUploadability: WikiPageUploadability.RESTRICTED,
          attachmentUploadability: WikiPageUploadability.RESTRICTED,
          ownerId: ownedById,
        },
      },
    },
    include: { wikiPages: true },
  });

  const positions = [];
  for (const [index, positionName] of positionNames.entries()) {
    positions.push(
      await prisma.eventPosition.create({
        data: { templateId: template.id, name: positionName, order: index },
      }),
    );
  }

  const rootPage = template.wikiPages[0]!;
  const briefingPages = [];
  for (const [index, title] of briefingPageTitles.entries()) {
    briefingPages.push(
      await prisma.wikiPage.create({
        data: {
          namespace: WikiPageNamespace.EVENT,
          templateId: template.id,
          parentId: rootPage.id,
          title,
          slug: title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
          sortOrder: index,
          eventReadScope: WikiPageEventScope.INHERIT,
          eventEditScope: WikiPageEventScope.INHERIT,
          createdById: ownedById,
        },
      }),
    );
  }

  return { template, rootPage, positions, briefingPages };
};

export {
  EventSource,
  EventTemplateAccessType,
  EventVisibility,
  FlowRoleAccessType,
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageSidebarMode,
  WikiPageVisibility,
};
