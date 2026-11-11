import type { Citizen } from "@sam-monorepo/database/client";
import {
  buildEventRecipientWhere,
  NOTIFIABLE_CITIZEN_WHERE,
  resolveEffectiveRoles,
} from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { OPEN_INVITATION_WHERE } from "./eventInvitationStatus.js";
import { requireManageableEvent } from "./eventManageGuard.js";
import { isAllowedToManageEvent } from "./eventManageRules.js";
import {
  resolveEventVisibility,
  type EventVisibilityInput,
} from "./eventVisibility.js";
import { requireParticipatableAppEvent } from "./participatableAppEvent.js";

type AddableParticipantsEvent = EventVisibilityInput & {
  readonly id: string;
};

/** The permissions a citizen needs before an event can mean anything to them */
const REQUIRED_PERMISSION_STRINGS = [
  "login;manage",
  "event;read",
  "event;manage",
] as const;

/**
 * The citizens a manager may add to an event: everyone who can see it and is
 * reachable for its notifications, minus everyone already participating.
 * Both the picker of the app and `addEventParticipants()` resolve through
 * this, so what the modal offers and what the use case accepts cannot drift
 * apart.
 *
 * The two shared where-fragments only narrow the scan — they cannot express
 * the role-level gate (comparing `RoleAssignment.currentLevel` against
 * `Role.maxLevel` across the relation), so they match a superset. The
 * decision is made in memory by `resolveEventVisibility()`, the same
 * predicate the event page itself uses. Anything looser would let a manager
 * enroll someone the event 404s for — who then cannot even cancel, since
 * cancelling needs to see the event too.
 *
 * Pass `citizenIds` to answer the question for a known set instead of for
 * every citizen.
 */
export const findAddableParticipantIds = async (
  prisma: ApplicationContext["prisma"],
  event: AddableParticipantsEvent,
  citizenIds?: readonly string[],
) => {
  const [candidates, permissionStrings] = await Promise.all([
    prisma.citizen.findMany({
      where: {
        AND: [
          buildEventRecipientWhere(event),
          NOTIFIABLE_CITIZEN_WHERE,
          {
            NOT: {
              eventParticipations: {
                some: { eventId: event.id, cancelledAt: null },
              },
            },
          },
          ...(citizenIds ? [{ id: { in: [...citizenIds] } }] : []),
        ],
      },
      select: {
        id: true,
        roleAssignments: {
          select: {
            currentLevel: true,
            role: {
              select: {
                id: true,
                maxLevel: true,
                inherits: { select: { id: true } },
              },
            },
          },
        },
      },
    }),
    prisma.permissionString.findMany({
      where: { permissionString: { in: [...REQUIRED_PERMISSION_STRINGS] } },
      select: { roleId: true, permissionString: true },
    }),
  ]);

  const roleIdsByPermission = new Map(
    REQUIRED_PERMISSION_STRINGS.map((permissionString) => [
      permissionString,
      new Set(
        permissionStrings
          .filter((entry) => entry.permissionString === permissionString)
          .map((entry) => entry.roleId),
      ),
    ]),
  );
  const holds = (
    permissionString: (typeof REQUIRED_PERMISSION_STRINGS)[number],
    roleIds: ReadonlySet<Citizen["id"]>,
  ) => {
    const grantingRoleIds = roleIdsByPermission.get(permissionString)!;
    for (const roleId of roleIds) if (grantingRoleIds.has(roleId)) return true;
    return false;
  };

  return candidates
    .filter((candidate) => {
      /** Same semantics as the session callback: levels and inheritance */
      const roleIds = new Set(
        resolveEffectiveRoles(candidate.roleAssignments).map((role) => role.id),
      );

      if (!holds("login;manage", roleIds)) return false;
      if (!holds("event;read", roleIds)) return false;

      return resolveEventVisibility(event, {
        citizenId: candidate.id,
        roleIds,
        hasEventManage: holds("event;manage", roleIds),
      });
    })
    .map((candidate) => candidate.id);
};

/**
 * The requested citizens of an add or an invitation without the active
 * participants. The picker offers exactly the addable set, so anything
 * outside it either raced with a sign-up or bypassed the UI: citizens who
 * signed up in the meantime are skipped, the rest fails the whole batch.
 *
 * @throws ValidationError
 */
export const selectNewParticipantIds = async (
  prisma: ApplicationContext["prisma"],
  event: AddableParticipantsEvent,
  citizenIds: readonly string[],
): Promise<string[]> => {
  const requestedCitizenIds = Array.from(new Set(citizenIds));
  if (requestedCitizenIds.length <= 0)
    throw new ValidationError(EventErrorMessage.NoCitizenSelected);

  const [addableCitizenIds, activeParticipants] = await Promise.all([
    findAddableParticipantIds(prisma, event, requestedCitizenIds),
    prisma.eventParticipant.findMany({
      where: {
        eventId: event.id,
        cancelledAt: null,
        citizenId: { in: requestedCitizenIds },
      },
      select: { citizenId: true },
    }),
  ]);

  const addable = new Set(addableCitizenIds);
  const alreadyActive = new Set(
    activeParticipants.map((participant) => participant.citizenId!),
  );

  const unknownCitizenId = requestedCitizenIds.find(
    (citizenId) => !addable.has(citizenId) && !alreadyActive.has(citizenId),
  );
  if (unknownCitizenId)
    throw new ValidationError(EventErrorMessage.CitizenCannotSeeEvent);

  return requestedCitizenIds.filter(
    (citizenId) => !alreadyActive.has(citizenId),
  );
};

export interface AddableEventParticipants {
  /** The citizens who can see the event and are not participating */
  readonly citizenIds: string[];
  /**
   * The citizens of `citizenIds` with an open invitation. An invitation
   * skips them, a direct add withdraws their invitation.
   */
  readonly invitedCitizenIds: string[];
}

/**
 * The citizens that the actor may add as participants to an app event, for
 * the picker of the app. The checks are the checks of
 * `addEventParticipants()`, thus the picker cannot list a set that the use
 * case refuses.
 *
 * @throws ForbiddenError without `event;read` or when the actor cannot
 * manage the event, NotFoundError when the actor cannot see the app event,
 * ConflictError `EventErrorMessage.EventEnded` or
 * `EventErrorMessage.ParticipationDisabled`
 */
export const findAddableEventParticipants = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<AddableEventParticipants> => {
  requirePermission(actor, "event", "read");

  const event = await requireParticipatableAppEvent(context, actor, eventId);
  requireManageableEvent(context, actor, event, isAllowedToManageEvent);

  const [citizenIds, openInvitations] = await Promise.all([
    findAddableParticipantIds(context.prisma, event),
    context.prisma.eventInvitation.findMany({
      where: { eventId: event.id, ...OPEN_INVITATION_WHERE },
      select: { citizenId: true },
    }),
  ]);

  const addable = new Set(citizenIds);

  return {
    citizenIds,
    invitedCitizenIds: openInvitations
      .map((invitation) => invitation.citizenId)
      .filter((citizenId) => addable.has(citizenId)),
  };
};
