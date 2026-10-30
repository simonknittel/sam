import type {
  EventDiscordPublishTarget,
  EventVisibility,
  Prisma,
} from "@sam-monorepo/database/client";
import {
  ACTIVE_CITIZEN_WHERE,
  resolveEventTemplatePermissions,
  type ResolvedEventTemplatePermissions,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { TEMPLATE_POSITION_TREE_INCLUDE } from "../lineup/positionTreeInclude.js";
import {
  buildVisibleEventTemplatesWhere,
  requireReadableEventTemplate,
  toEventTemplateViewer,
} from "./eventTemplateAccess.js";
import {
  buildEventTemplateSharingWhere,
  buildEventTemplateStatusWhere,
  type EventTemplateSharing,
  type EventTemplateStatus,
} from "./eventTemplateFilters.js";

/*
 * The rows of the template pages. The pages serialize them into the
 * browser, thus a citizen is only what a `CitizenLink` needs.
 */

const DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  participationEnabled: true,
  discordPublishTarget: true,
  discordPublishChannelId: true,
  discordPublishLocation: true,
  coverImageId: true,
  visibilityRoles: { select: { roleId: true } },
  roleAccess: { select: { roleId: true, type: true } },
  createdAt: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  updatedAt: true,
  updatedBy: { select: CITIZEN_REFERENCE_SELECT },
  ownedById: true,
  ownedBy: { select: CITIZEN_REFERENCE_SELECT },
  deletedAt: true,
  deletedBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.EventTemplateSelect;

export type EventTemplateDetails = Prisma.EventTemplateGetPayload<{
  select: typeof DETAIL_SELECT;
}>;

export interface EventTemplateDetailsEntry {
  readonly template: EventTemplateDetails;
  readonly permissions: ResolvedEventTemplatePermissions;
}

/**
 * One template with the permissions of the actor, for the template pages and
 * the template briefing. A deleted template is in the result for the actors
 * who can restore it.
 *
 * @throws NotFoundError when the template does not exist or the actor cannot
 *   read it: the two are deliberately indistinguishable
 */
export const findEventTemplateDetails = (
  context: ApplicationContext,
  actor: Actor,
  { templateId }: { readonly templateId: string },
): Promise<EventTemplateDetailsEntry> =>
  requireReadableEventTemplate(context, actor, templateId, {
    allowDeleted: true,
    select: DETAIL_SELECT,
  });

/**
 * Everything the list table renders about one template. The list searches
 * the description but never shows it, so it stays out of the rows that
 * reach the browser; the picker's own select keeps it, because it prefills a
 * new event from it.
 */
const LIST_SELECT = {
  id: true,
  name: true,
  visibility: true,
  coverImageId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  ownedById: true,
  ownedBy: { select: CITIZEN_REFERENCE_SELECT },
  updatedBy: { select: CITIZEN_REFERENCE_SELECT },
  roleAccess: { select: { roleId: true, type: true } },
} as const satisfies Prisma.EventTemplateSelect;

export type EventTemplateListRow = Prisma.EventTemplateGetPayload<{
  select: typeof LIST_SELECT;
}>;

export interface EventTemplateListEntry {
  readonly template: EventTemplateListRow;
  readonly permissions: ResolvedEventTemplatePermissions;
}

export interface EventTemplateListFilters {
  readonly status: EventTemplateStatus;
  readonly sharing: EventTemplateSharing;
  /** Only applied for `event;manage` holders, so it can never widen a view */
  readonly ownerId: string | null;
  /** The host bounds it with `EVENT_TEMPLATE_LIST_QUERY_MAXIMUM_LENGTH` */
  readonly query: string | null;
}

/**
 * The bound of the search term of the list, which comes from the URL. Longer
 * terms are pointless: the name has at most 128 characters.
 */
export const EVENT_TEMPLATE_LIST_QUERY_MAXIMUM_LENGTH = 255;

/**
 * The templates the actor may see, newest change first, with their resolved
 * permissions. The visibility fragment is ANDed in so no filter can widen
 * the result — the owner filter in particular is only honored for
 * `event;manage` holders, who see everything anyway.
 */
export const findEventTemplateListRows = async (
  context: ApplicationContext,
  actor: Actor,
  filters: EventTemplateListFilters,
): Promise<EventTemplateListEntry[]> => {
  const viewer = toEventTemplateViewer(actor);
  const { query } = filters;

  const templates = await context.prisma.eventTemplate.findMany({
    where: {
      AND: [
        buildVisibleEventTemplatesWhere(viewer),
        buildEventTemplateStatusWhere(filters.status),
        buildEventTemplateSharingWhere(filters.sharing),
        viewer.hasEventManage && filters.ownerId
          ? { ownedById: filters.ownerId }
          : {},
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    select: LIST_SELECT,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  const permissions = resolveEventTemplatePermissions(templates, viewer);

  return templates.flatMap((template) => {
    const templatePermissions = permissions.get(template.id);

    return templatePermissions
      ? [{ template, permissions: templatePermissions }]
      : [];
  });
};

export type EventTemplateOwner = CitizenReferenceRow;

/**
 * The distinct owners of the templates, for the owner filter of the list.
 * Only `event;manage` holders get the filter, thus everybody else gets an
 * empty list.
 */
export const findEventTemplateOwners = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<EventTemplateOwner[]> => {
  if (!toEventTemplateViewer(actor).hasEventManage) return [];

  return context.prisma.citizen.findMany({
    where: { ...ACTIVE_CITIZEN_WHERE, ownedEventTemplates: { some: {} } },
    select: CITIZEN_REFERENCE_SELECT,
    orderBy: { handle: "asc" },
  });
};

/** Everything the create-event form prefills from a template */
const PICKER_SELECT = {
  id: true,
  name: true,
  description: true,
  visibility: true,
  participationEnabled: true,
  discordPublishTarget: true,
  discordPublishChannelId: true,
  discordPublishLocation: true,
  coverImageId: true,
  ownedById: true,
  deletedAt: true,
  roleAccess: { select: { roleId: true, type: true } },
  visibilityRoles: { select: { roleId: true } },
} as const satisfies Prisma.EventTemplateSelect;

/** A template in the picker of the create-event form */
export interface UsableEventTemplateRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly visibility: EventVisibility;
  readonly visibilityRoleIds: string[];
  readonly participationEnabled: boolean;
  readonly coverImageId: string | null;
  readonly discordPublishTarget: EventDiscordPublishTarget | null;
  readonly discordPublishChannelId: string | null;
  readonly discordPublishLocation: string | null;
}

/**
 * The templates that are not deleted and that the actor may use when they
 * create an event. Deliberately not filtered by `canEdit` — using a template
 * is what a read share is for.
 */
export const findUsableEventTemplates = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<UsableEventTemplateRow[]> => {
  const viewer = toEventTemplateViewer(actor);

  const templates = await context.prisma.eventTemplate.findMany({
    where: {
      AND: [buildVisibleEventTemplatesWhere(viewer), { deletedAt: null }],
    },
    select: PICKER_SELECT,
    orderBy: [{ name: "asc" }],
  });

  const permissions = resolveEventTemplatePermissions(templates, viewer);

  return templates
    .filter((template) => permissions.get(template.id)?.canRead === true)
    .map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      visibility: template.visibility,
      visibilityRoleIds: template.visibilityRoles.map(
        (visibilityRole) => visibilityRole.roleId,
      ),
      participationEnabled: template.participationEnabled,
      coverImageId: template.coverImageId,
      discordPublishTarget: template.discordPublishTarget,
      discordPublishChannelId: template.discordPublishChannelId,
      discordPublishLocation: template.discordPublishLocation,
    }));
};

/**
 * Whether the templates section has anything to offer the actor: they may
 * create one, they manage all of them, or at least one template is visible
 * to them — which covers a role-shared editor without `event;create`.
 */
export const canAccessEventTemplates = async (
  context: ApplicationContext,
  actor: Actor,
): Promise<boolean> => {
  const viewer = toEventTemplateViewer(actor);
  if (viewer.hasEventManage) return true;
  if (actor.authorize("event", "create")) return true;

  const visibleTemplate = await context.prisma.eventTemplate.findFirst({
    where: {
      AND: [buildVisibleEventTemplatesWhere(viewer), { deletedAt: null }],
    },
    select: { id: true },
  });

  return visibleTemplate !== null;
};

export type EventTemplatePosition = Prisma.EventPositionGetPayload<{
  include: typeof TEMPLATE_POSITION_TREE_INCLUDE;
}>;

/**
 * The lineup blueprint of a template, in the same nested shape the event
 * lineup renders. Also for a deleted template, which the actors who can
 * restore it still see.
 *
 * @throws NotFoundError when the actor cannot read the template
 */
export const findEventTemplatePositionTree = async (
  context: ApplicationContext,
  actor: Actor,
  { templateId }: { readonly templateId: string },
): Promise<EventTemplatePosition[]> => {
  await requireReadableEventTemplate(context, actor, templateId, {
    allowDeleted: true,
  });

  return context.prisma.eventPosition.findMany({
    where: {
      templateId,
      parentPositionId: null,
    },
    orderBy: {
      order: "asc",
    },
    include: TEMPLATE_POSITION_TREE_INCLUDE,
  });
};
