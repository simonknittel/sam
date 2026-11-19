import type { Prisma } from "@sam-monorepo/database/client";
import { EventApplicationStatus } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { toEventApplicationStatus } from "./eventApplicationStatus.js";
import { requireVisibleEvent } from "./findVisibleEvent.js";

const EVENT_APPLICATION_SELECT = {
  id: true,
  comment: true,
  createdAt: true,
  approvedAt: true,
  declinedAt: true,
  declineReason: true,
  withdrawnAt: true,
  declinedBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.EventApplicationSelect;

type EventApplicationSelectRow = Prisma.EventApplicationGetPayload<{
  select: typeof EVENT_APPLICATION_SELECT;
}>;

/** An application as the event pages show it */
export interface EventApplicationDetails {
  readonly id: string;
  readonly status: EventApplicationStatus;
  /** The note of the citizen */
  readonly comment: string | null;
  /** The note of the manager to the citizen when they declined */
  readonly declineReason: string | null;
  readonly createdAt: Date;
  readonly declinedAt: Date | null;
  /** Null when the manager has no citizen or the citizen was deleted */
  readonly declinedBy: CitizenReferenceRow | null;
}

const toEventApplicationDetails = (
  application: EventApplicationSelectRow,
): EventApplicationDetails => ({
  id: application.id,
  status: toEventApplicationStatus(application),
  comment: application.comment,
  declineReason: application.declineReason,
  createdAt: application.createdAt,
  declinedAt: application.declinedAt,
  declinedBy: application.declinedBy,
});

export interface EventApplicationRow extends EventApplicationDetails {
  readonly citizen: CitizenReferenceRow;
}

/**
 * The applications that still say something about an event: the latest
 * application of each citizen when it is open, or when a manager declined it
 * and did not sign the citizen up later. The newest first. The caller
 * checked that the actor can see the event.
 */
export const loadEventApplicationRows = async (
  prisma: ApplicationContext["prisma"],
  eventId: string,
): Promise<EventApplicationRow[]> => {
  const [latestApplications, activeParticipants] = await Promise.all([
    prisma.eventApplication.findMany({
      where: { eventId },
      distinct: ["citizenId"],
      orderBy: [{ citizenId: "asc" }, { createdAt: "desc" }],
      select: {
        ...EVENT_APPLICATION_SELECT,
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

  return latestApplications
    .map((application) => ({
      ...toEventApplicationDetails(application),
      citizen: application.citizen,
    }))
    .filter(
      (application) =>
        application.status === EventApplicationStatus.Open ||
        (application.status === EventApplicationStatus.Declined &&
          !participatingCitizenIds.has(application.citizen.id)),
    )
    .toSorted(
      (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
    );
};

/**
 * The applications of an event that the actor can see, for the participants
 * page (see `loadEventApplicationRows()`)
 *
 * @throws ForbiddenError without `event;read`, NotFoundError when the actor
 * cannot see the event
 */
export const findEventApplicationRows = async (
  context: ApplicationContext,
  actor: Actor,
  { eventId }: { readonly eventId: string },
): Promise<EventApplicationRow[]> => {
  const event = await requireVisibleEvent(context, actor, eventId);

  return loadEventApplicationRows(context.prisma, event.id);
};

/** The latest application of the citizen for the event, or null */
export const loadOwnEventApplication = async (
  prisma: ApplicationContext["prisma"],
  eventId: string,
  citizenId: string,
): Promise<EventApplicationDetails | null> => {
  const application = await prisma.eventApplication.findFirst({
    where: { eventId, citizenId },
    orderBy: { createdAt: "desc" },
    select: EVENT_APPLICATION_SELECT,
  });

  return application ? toEventApplicationDetails(application) : null;
};
