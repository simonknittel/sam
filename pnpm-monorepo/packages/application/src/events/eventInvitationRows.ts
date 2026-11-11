import type { Prisma } from "@sam-monorepo/database/client";
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

/** An invitation as the event pages show it */
export interface EventInvitationDetails {
  readonly id: string;
  readonly status: EventInvitationStatus;
  /** The note of the manager */
  readonly message: string | null;
  /** The note of the citizen to the managers when they declined */
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

export interface EventInvitationRow extends EventInvitationDetails {
  readonly citizen: CitizenReferenceRow;
}

/**
 * The invitations that still say something about an event: the latest
 * invitation of each citizen when it is open, or when the citizen declined
 * it and did not sign up later. The newest first. The caller checked that
 * the actor can see the event.
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
        citizen: { select: CITIZEN_REFERENCE_SELECT },
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

/**
 * The invitations of an event that the actor can see, for the participants
 * page (see `loadEventInvitationRows()`)
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findEventInvitationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<EventInvitationRow[]> => {
  const event = await requireVisibleEvent(context, actor, eventId);

  return loadEventInvitationRows(context.prisma, event.id);
};

/** The latest invitation of the citizen to the event, or null */
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
  /**
   * False when the invitation is not open, or when the event ended, is
   * deleted, turned off the participation or is not visible to the actor
   * anymore
   */
  readonly isAnswerable: boolean;
}

/**
 * The current state of an invitation of the actor, for the buttons of its
 * notification
 *
 * @throws ForbiddenError without a citizen or without `event;read`,
 * NotFoundError `EventErrorMessage.InvitationNotFound` when the invitation
 * does not exist or is for a different citizen
 */
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
      acceptedAt: true,
      declinedAt: true,
      withdrawnAt: true,
    },
  });
  if (!invitation)
    throw new NotFoundError(EventErrorMessage.InvitationNotFound);

  const status = toEventInvitationStatus(invitation);
  if (status !== EventInvitationStatus.Open)
    return { eventId: invitation.eventId, status, isAnswerable: false };

  const event = await findParticipatableAppEvent(
    context,
    actor,
    invitation.eventId,
  );

  return {
    eventId: invitation.eventId,
    status,
    isAnswerable:
      event !== null &&
      event.participationEnabled &&
      isParticipationOpen(event, context.now()),
  };
};
