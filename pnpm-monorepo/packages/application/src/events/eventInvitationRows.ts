import type { Prisma, RoleAssignment } from "@sam-monorepo/database/client";
import { EventInvitationStatus } from "@sam-monorepo/domain";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { EventErrorMessage } from "./eventErrors.js";
import { toEventInvitationStatus } from "./eventInvitationStatus.js";
import { requireVisibleEvent } from "./findVisibleEvent.js";
import {
  findParticipatableAppEvent,
  isParticipationOpen,
} from "./participatableAppEvent.js";

const EVENT_INVITATION_SELECT = {
  id: true,
  message: true,
  createdAt: true,
  acceptedAt: true,
  declinedAt: true,
  declineComment: true,
  withdrawnAt: true,
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.EventInvitationSelect;

type EventInvitationSelectRow = Prisma.EventInvitationGetPayload<{
  select: typeof EVENT_INVITATION_SELECT;
}>;

export interface EventInvitationDetails {
  readonly id: string;
  readonly status: EventInvitationStatus;
  readonly message: string | null;
  readonly declineComment: string | null;
  readonly createdAt: Date;
  readonly declinedAt: Date | null;
  /** Null when the manager has no citizen or the citizen was deleted */
  readonly invitedBy: CitizenReferenceRow | null;
}

const toEventInvitationDetails = (
  invitation: EventInvitationSelectRow,
): EventInvitationDetails => ({
  id: invitation.id,
  status: toEventInvitationStatus(invitation),
  message: invitation.message,
  declineComment: invitation.declineComment,
  createdAt: invitation.createdAt,
  declinedAt: invitation.declinedAt,
  invitedBy: invitation.createdBy,
});

/** The roles are for the role filter of the page */
export interface EventInvitationCitizen extends CitizenReferenceRow {
  readonly roleAssignments: Pick<RoleAssignment, "roleId" | "currentLevel">[];
}

export interface EventInvitationRow extends EventInvitationDetails {
  readonly citizen: EventInvitationCitizen;
}

/**
 * The invitations that still say something about an event: the latest
 * invitation of each citizen when it is open, or when the citizen declined it
 * and did not sign up later. The caller checked that the actor can see the
 * event.
 */
export const loadEventInvitationRows = async (
  prisma: ApplicationContext["prisma"],
  eventId: string,
): Promise<EventInvitationRow[]> => {
  const [latestInvitations, activeParticipants] = await Promise.all([
    prisma.eventInvitation.findMany({
      where: { eventId },
      distinct: ["citizenId"],
      orderBy: [{ citizenId: "asc" }, { createdAt: "desc" }],
      select: {
        ...EVENT_INVITATION_SELECT,
        citizen: {
          select: {
            ...CITIZEN_REFERENCE_SELECT,
            roleAssignments: { select: { roleId: true, currentLevel: true } },
          },
        },
      },
    }),
    prisma.eventParticipant.findMany({
      where: { eventId, cancelledAt: null, citizenId: { not: null } },
      select: { citizenId: true },
    }),
  ]);

  const participatingCitizenIds = new Set(
    activeParticipants.map((participant) => participant.citizenId),
  );

  return latestInvitations
    .map((invitation) => ({
      ...toEventInvitationDetails(invitation),
      citizen: invitation.citizen,
    }))
    .filter(
      (invitation) =>
        invitation.status === EventInvitationStatus.Open ||
        (invitation.status === EventInvitationStatus.Declined &&
          !participatingCitizenIds.has(invitation.citizen.id)),
    )
    .toSorted(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    );
};

export const findEventInvitationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<EventInvitationRow[]> => {
  const event = await requireVisibleEvent(context, actor, eventId);

  return loadEventInvitationRows(context.prisma, event.id);
};

export const loadOwnEventInvitation = async (
  prisma: ApplicationContext["prisma"],
  eventId: string,
  citizenId: string,
): Promise<EventInvitationDetails | null> => {
  const invitation = await prisma.eventInvitation.findFirst({
    where: { eventId, citizenId },
    orderBy: { createdAt: "desc" },
    select: EVENT_INVITATION_SELECT,
  });

  return invitation ? toEventInvitationDetails(invitation) : null;
};

export interface OwnEventInvitationState {
  readonly eventId: string;
  readonly status: EventInvitationStatus;
  readonly message: string | null;
  readonly invitedBy: CitizenReferenceRow | null;
  /**
   * False when the invitation is not open, or when the event ended, is
   * deleted, turned off the participation or is not visible to the actor
   * anymore
   */
  readonly isAnswerable: boolean;
}

export const findOwnEventInvitationState = async (
  context: ApplicationContext,
  actor: Actor,
  { invitationId }: { readonly invitationId: string },
): Promise<OwnEventInvitationState> => {
  const citizenId = requireCitizen(actor).id;
  requirePermission(actor, "event", "read");

  const invitation = await context.prisma.eventInvitation.findFirst({
    where: { id: invitationId, citizenId },
    select: {
      eventId: true,
      message: true,
      acceptedAt: true,
      declinedAt: true,
      withdrawnAt: true,
      createdBy: { select: CITIZEN_REFERENCE_SELECT },
    },
  });
  if (!invitation)
    throw new NotFoundError(EventErrorMessage.InvitationNotFound);

  const state = {
    eventId: invitation.eventId,
    status: toEventInvitationStatus(invitation),
    message: invitation.message,
    invitedBy: invitation.createdBy,
  };
  if (state.status !== EventInvitationStatus.Open)
    return { ...state, isAnswerable: false };

  const event = await findParticipatableAppEvent(
    context,
    actor,
    invitation.eventId,
  );

  return {
    ...state,
    isAnswerable:
      event !== null &&
      event.participationEnabled &&
      isParticipationOpen(event, context.now()),
  };
};
