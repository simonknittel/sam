import { WikiPageNamespace, type Prisma } from "@sam-monorepo/database/client";
import {
  collectPositionScopeIdsForCitizen,
  comparePermissionSets,
  createEventWikiPagePermissionResolver,
  createWikiPagePermissionResolver,
  getEventEndTime,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { loadEffectivePermissionsOfCitizens } from "../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../context.js";
import { resolveEventVisibility } from "../events/eventVisibility.js";

/** The fields of a pending mention that the gate and the job read */
export const PENDING_WIKI_MENTION_SELECT = {
  id: true,
  pageId: true,
  citizenId: true,
  createdById: true,
  page: {
    select: { namespace: true, eventId: true, deletedAt: true },
  },
} satisfies Prisma.WikiPageCitizenMentionSelect;

export type PendingWikiMention = Prisma.WikiPageCitizenMentionGetPayload<{
  select: typeof PENDING_WIKI_MENTION_SELECT;
}>;

const WIKI_PAGE_PERMISSION_SELECT = {
  id: true,
  parentId: true,
  ownerId: true,
  visibility: true,
  editability: true,
  imageUploadability: true,
  attachmentUploadability: true,
  roleAccess: { select: { roleId: true, type: true } },
} satisfies Prisma.WikiPageSelect;

const MENTION_EVENT_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  participationEnabled: true,
  createdById: true,
  visibility: true,
  deletedAt: true,
  visibilityRoles: { select: { roleId: true } },
  managers: { select: { id: true } },
  participants: {
    where: { cancelledAt: null },
    select: { citizenId: true },
  },
  positions: {
    select: { id: true, parentPositionId: true, citizenId: true },
  },
  wikiPages: {
    select: {
      id: true,
      parentId: true,
      eventReadScope: true,
      eventReadScopePositionId: true,
      eventEditScope: true,
      eventEditScopePositionId: true,
      imageUploadability: true,
      attachmentUploadability: true,
    },
  },
} satisfies Prisma.EventSelect;

type MentionEvent = Prisma.EventGetPayload<{
  select: typeof MENTION_EVENT_SELECT;
}>;

interface CitizenGrants {
  readonly roleIds: ReadonlySet<string>;
  readonly hasLoginManage: boolean;
  readonly hasWikiManage: boolean;
  readonly hasEventRead: boolean;
  readonly hasEventManage: boolean;
}

const NO_GRANTS: CitizenGrants = {
  roleIds: new Set(),
  hasLoginManage: false,
  hasWikiManage: false,
  hasEventRead: false,
  hasEventManage: false,
};

const hasPermission = (
  permissionSets: PermissionSet[],
  resource: PermissionSet["resource"],
  operation: PermissionSet["operation"],
) => comparePermissionSets({ resource, operation }, permissionSets);

/**
 * The effective role ids and the app-level permissions of each citizen: the
 * wiki read gate must not be looser than the page itself. A deleted citizen
 * gets no grants.
 */
const loadCitizenGrants = async (
  context: ApplicationContext,
  citizenIds: readonly string[],
) => {
  const permissionsByCitizenId = await loadEffectivePermissionsOfCitizens(
    context,
    { id: { in: [...citizenIds] } },
  );

  return new Map(
    citizenIds.map((citizenId): [string, CitizenGrants] => {
      const permissions = permissionsByCitizenId.get(citizenId);
      if (!permissions) return [citizenId, NO_GRANTS];

      const { roleIds, permissionSets } = permissions;
      return [
        citizenId,
        {
          roleIds,
          hasLoginManage: hasPermission(permissionSets, "login", "manage"),
          hasWikiManage: hasPermission(permissionSets, "wiki", "manage"),
          hasEventRead: hasPermission(permissionSets, "event", "read"),
          hasEventManage: hasPermission(permissionSets, "event", "manage"),
        },
      ];
    }),
  );
};

/**
 * Builds the check that a pending mention passes when the mentioned citizen
 * can log in and read the page now. A page of the WIKI namespace uses the
 * role-based resolver. A page of the EVENT namespace needs an event that the
 * citizen can see (`resolveEventVisibility()`, thus not deleted), like the
 * briefing of the app (`buildEventWikiContext()`). Then it uses the event
 * resolver, which keeps unpublished briefings silent.
 */
export const createWikiMentionReadGate = async (
  context: ApplicationContext,
  pending: readonly PendingWikiMention[],
) => {
  const citizenIds = [...new Set(pending.map((mention) => mention.citizenId))];
  const hasWikiPageMention = pending.some(
    (mention) => mention.page.namespace === WikiPageNamespace.WIKI,
  );
  const eventIds = [
    ...new Set(
      pending
        .map((mention) => mention.page.eventId)
        .filter((eventId): eventId is string => eventId !== null),
    ),
  ];

  const [grantsByCitizenId, wikiPages, events] = await Promise.all([
    loadCitizenGrants(context, citizenIds),
    hasWikiPageMention
      ? context.prisma.wikiPage.findMany({
          where: { namespace: WikiPageNamespace.WIKI },
          select: WIKI_PAGE_PERMISSION_SELECT,
        })
      : [],
    eventIds.length > 0
      ? context.prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: MENTION_EVENT_SELECT,
        })
      : [],
  ]);

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const eventHasEnded = (event: MentionEvent) =>
    getEventEndTime(event) <= context.now();

  /** One resolver per citizen covers every page of the WIKI namespace */
  const wikiResolvers = new Map<
    string,
    ReturnType<typeof createWikiPagePermissionResolver>
  >();
  const getWikiResolver = (citizenId: string, grants: CitizenGrants) => {
    const cachedResolver = wikiResolvers.get(citizenId);
    if (cachedResolver) return cachedResolver;

    const resolver = createWikiPagePermissionResolver(wikiPages, {
      citizenId,
      roleIds: grants.roleIds,
      hasWikiManage: grants.hasWikiManage,
    });
    wikiResolvers.set(citizenId, resolver);
    return resolver;
  };

  const eventResolvers = new Map<
    string,
    ReturnType<typeof createEventWikiPagePermissionResolver>
  >();
  const getEventResolver = (
    event: MentionEvent,
    citizenId: string,
    grants: CitizenGrants,
  ) => {
    const key = `${event.id}:${citizenId}`;
    const cachedResolver = eventResolvers.get(key);
    if (cachedResolver) return cachedResolver;

    const resolver = createEventWikiPagePermissionResolver(
      event.wikiPages,
      {
        isParticipant: event.participants.some(
          (participant) => participant.citizenId === citizenId,
        ),
        isEventManager:
          event.createdById === citizenId ||
          event.managers.some((manager) => manager.id === citizenId) ||
          grants.hasEventManage,
        positionScopeIds: collectPositionScopeIdsForCitizen(
          event.positions,
          citizenId,
        ),
      },
      {
        frozen: eventHasEnded(event),
        participationEnabled: event.participationEnabled,
      },
    );
    eventResolvers.set(key, resolver);
    return resolver;
  };

  return (mention: PendingWikiMention) => {
    const grants = grantsByCitizenId.get(mention.citizenId) ?? NO_GRANTS;
    if (!grants.hasLoginManage) return false;

    if (mention.page.namespace === WikiPageNamespace.WIKI) {
      return (
        getWikiResolver(mention.citizenId, grants).get(mention.pageId)
          ?.canRead === true
      );
    }

    const event = mention.page.eventId
      ? eventsById.get(mention.page.eventId)
      : undefined;
    if (!event || !grants.hasEventRead) return false;

    const canSeeEvent = resolveEventVisibility(event, {
      citizenId: mention.citizenId,
      roleIds: grants.roleIds,
      hasEventManage: grants.hasEventManage,
    });
    if (!canSeeEvent) return false;

    return (
      getEventResolver(event, mention.citizenId, grants).get(mention.pageId)
        ?.canRead === true
    );
  };
};
