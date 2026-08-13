import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import { WikiPageNamespace } from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  collectPositionScopeIdsForCitizen,
  comparePermissionSets,
  createEventWikiPagePermissionResolver,
  createWikiPagePermissionResolver,
  getPermissionSetsByRoles,
  resolveEffectiveRoles,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

/**
 * Bounds one run's work against the Lambda's 90s timeout. Leftover pending
 * rows simply roll into the next run 15 minutes later.
 */
const MAX_MENTIONS_PER_RUN = 200;
/** PutEvents accepts at most 10 entries per call */
const EVENTBRIDGE_BATCH_SIZE = 10;

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

/**
 * Effective role ids and app-level permissions per citizen, using the same
 * strict semantics as the app's session (`resolveEffectiveRoles`: level
 * gate + inheritance) — the wiki read gate must not be looser than the
 * page itself.
 */
const loadCitizenGrants = async (citizenIds: readonly string[]) => {
  const assignments = await prisma.roleAssignment.findMany({
    where: { citizenId: { in: [...citizenIds] } },
    select: {
      citizenId: true,
      currentLevel: true,
      role: {
        include: {
          permissionStrings: true,
          inherits: { include: { permissionStrings: true } },
        },
      },
    },
  });

  const assignmentsByCitizenId = Map.groupBy(
    assignments,
    (assignment) => assignment.citizenId,
  );

  const has = (
    permissionSets: PermissionSet[],
    resource: PermissionSet["resource"],
    operation: PermissionSet["operation"],
  ) => comparePermissionSets({ resource, operation }, permissionSets);

  const grants = new Map<string, CitizenGrants>();
  for (const citizenId of citizenIds) {
    const citizenAssignments = assignmentsByCitizenId.get(citizenId);
    if (!citizenAssignments) {
      grants.set(citizenId, NO_GRANTS);
      continue;
    }

    const effectiveRoles = resolveEffectiveRoles(citizenAssignments);
    const permissionSets = getPermissionSetsByRoles(effectiveRoles);
    grants.set(citizenId, {
      roleIds: new Set(effectiveRoles.map((role) => role.id)),
      hasLoginManage: has(permissionSets, "login", "manage"),
      hasWikiManage: has(permissionSets, "wiki", "manage"),
      hasEventRead: has(permissionSets, "event", "read"),
      hasEventManage: has(permissionSets, "event", "manage"),
    });
  }
  return grants;
};

/** Mirrors the app's `isEventUpdatable`: an event without an explicit end
 * counts as over four hours after its start. */
const isEventOver = (event: {
  readonly startTime: Date;
  readonly endTime: Date | null;
}) => {
  const now = new Date();
  if (!event.endTime) {
    const endTime = new Date(event.startTime);
    endTime.setHours(endTime.getHours() + 4);
    return endTime <= now;
  }
  return event.endTime <= now;
};

/**
 * Turns pending mention links (written by the collab server) into
 * notification requests, throttled to this automation's 15-minute cadence.
 * A mention removed before its run has deleted its row — nothing fires.
 *
 * Every mention is gated at send time: the mentioned citizen must be able
 * to log in and read the page right now (WIKI namespace via the role-based
 * resolver, EVENT namespace via the event resolver, which keeps
 * unpublished briefings silent). Gate failures are suppressed permanently
 * rather than retried. Survivors are emitted to the notification router
 * and marked notified afterwards — a crash in between can duplicate, never
 * lose deliveries.
 */
export const wikiCitizenMentioned = async () => {
  await captureAsyncFunc("wikiCitizenMentioned", async () => {
    const pending = await prisma.wikiPageCitizenMention.findMany({
      where: { notifiedAt: null, suppressedAt: null },
      orderBy: { createdAt: "asc" },
      take: MAX_MENTIONS_PER_RUN,
      select: {
        id: true,
        pageId: true,
        citizenId: true,
        createdById: true,
        page: {
          select: { namespace: true, eventId: true, deletedAt: true },
        },
      },
    });

    void log.info("Checking pending wiki citizen mentions", {
      count: pending.length,
    });
    if (pending.length === 0) return;

    const citizenIds = [
      ...new Set(pending.map((mention) => mention.citizenId)),
    ];
    const wikiPageIds = new Set(
      pending
        .filter((mention) => mention.page.namespace === WikiPageNamespace.WIKI)
        .map((mention) => mention.pageId),
    );
    const eventIds = [
      ...new Set(
        pending
          .map((mention) => mention.page.eventId)
          .filter((eventId): eventId is string => eventId !== null),
      ),
    ];

    const [grants, citizens, wikiPages, events] = await Promise.all([
      loadCitizenGrants(citizenIds),
      prisma.entity.findMany({
        where: { id: { in: citizenIds } },
        select: { id: true, discordId: true },
      }),
      wikiPageIds.size > 0
        ? prisma.wikiPage.findMany({
            where: { namespace: WikiPageNamespace.WIKI },
            select: {
              id: true,
              parentId: true,
              ownerId: true,
              visibility: true,
              editability: true,
              imageUploadability: true,
              attachmentUploadability: true,
              roleAccess: { select: { roleId: true, type: true } },
            },
          })
        : Promise.resolve([]),
      eventIds.length > 0
        ? prisma.event.findMany({
            where: { id: { in: eventIds } },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              discordCreatorId: true,
              managers: { select: { id: true } },
              discordParticipants: { select: { discordUserId: true } },
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
            },
          })
        : Promise.resolve([]),
    ]);

    const discordIdByCitizenId = new Map(
      citizens.map((citizen) => [citizen.id, citizen.discordId]),
    );
    const eventsById = new Map(events.map((event) => [event.id, event]));

    /** One resolver per citizen covers every WIKI page */
    const wikiResolvers = new Map<
      string,
      ReturnType<typeof createWikiPagePermissionResolver>
    >();
    const getWikiResolver = (citizenId: string, grant: CitizenGrants) => {
      const cached = wikiResolvers.get(citizenId);
      if (cached) return cached;
      const resolver = createWikiPagePermissionResolver(wikiPages, {
        citizenId,
        roleIds: grant.roleIds,
        hasWikiManage: grant.hasWikiManage,
      });
      wikiResolvers.set(citizenId, resolver);
      return resolver;
    };

    const eventResolvers = new Map<
      string,
      ReturnType<typeof createEventWikiPagePermissionResolver>
    >();
    const getEventResolver = (
      event: NonNullable<ReturnType<(typeof eventsById)["get"]>>,
      citizenId: string,
      grant: CitizenGrants,
    ) => {
      const key = `${event.id}:${citizenId}`;
      const cached = eventResolvers.get(key);
      if (cached) return cached;

      const discordId = discordIdByCitizenId.get(citizenId) ?? null;
      const resolver = createEventWikiPagePermissionResolver(
        event.wikiPages,
        {
          isParticipant:
            discordId !== null &&
            event.discordParticipants.some(
              (participant) => participant.discordUserId === discordId,
            ),
          isEventManager:
            event.managers.some((manager) => manager.id === citizenId) ||
            (discordId !== null && event.discordCreatorId === discordId) ||
            grant.hasEventManage,
          positionScopeIds: collectPositionScopeIdsForCitizen(
            event.positions,
            citizenId,
          ),
        },
        { frozen: isEventOver(event) },
      );
      eventResolvers.set(key, resolver);
      return resolver;
    };

    const mayRead = (mention: (typeof pending)[number]) => {
      const grant = grants.get(mention.citizenId) ?? NO_GRANTS;
      if (!grant.hasLoginManage) return false;

      if (mention.page.namespace === WikiPageNamespace.WIKI) {
        return (
          getWikiResolver(mention.citizenId, grant).get(mention.pageId)
            ?.canRead === true
        );
      }

      const event = mention.page.eventId
        ? eventsById.get(mention.page.eventId)
        : undefined;
      if (!event || !grant.hasEventRead) return false;
      return (
        getEventResolver(event, mention.citizenId, grant).get(mention.pageId)
          ?.canRead === true
      );
    };

    const notifiable: (typeof pending)[number][] = [];
    const suppressedIds: string[] = [];
    for (const mention of pending) {
      /** Self-mentions are pre-suppressed by the collab server; only
       * defense in depth here */
      const isSelfMention = mention.citizenId === mention.createdById;
      if (mention.page.deletedAt || isSelfMention || !mayRead(mention)) {
        suppressedIds.push(mention.id);
        continue;
      }
      notifiable.push(mention);
    }

    void log.info("Gated pending wiki citizen mentions", {
      notified: notifiable.length,
      suppressed: suppressedIds.length,
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT,
        data: {
          notifiedCount: notifiable.length,
          suppressedCount: suppressedIds.length,
        },
      },
    ]);

    if (suppressedIds.length > 0) {
      await prisma.wikiPageCitizenMention.updateMany({
        where: { id: { in: suppressedIds } },
        data: { suppressedAt: new Date() },
      });
    }
    if (notifiable.length === 0) return;

    for (
      let index = 0;
      index < notifiable.length;
      index += EVENTBRIDGE_BATCH_SIZE
    ) {
      await emitEvents(
        notifiable
          .slice(index, index + EVENTBRIDGE_BATCH_SIZE)
          .map((mention) => ({
            Source: "frequent-automations",
            DetailType: "NotificationRequested",
            Detail: JSON.stringify({
              type: "WikiCitizenMentioned",
              payload: {
                mentionId: mention.id,
              },
              requestId: createId(),
            }),
          })),
      );
    }

    await prisma.wikiPageCitizenMention.updateMany({
      where: { id: { in: notifiable.map((mention) => mention.id) } },
      data: { notifiedAt: new Date() },
    });
  });
};
