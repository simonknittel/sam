import { EventActivityType, EventSource } from "@sam-monorepo/database/browser";
import type { Citizen, Event, Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  EventApplicationAnswer,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import type { ApplicationContext, Notification } from "../context.js";
import { findAddableParticipantIds } from "./addableParticipants.js";
import { createEventActivity } from "./eventActivity.js";
import { OPEN_APPLICATION_WHERE } from "./eventApplicationStatus.js";
import {
  withdrawOpenInvitations,
  type InvitationOfCitizen,
} from "./eventInvitations.js";
import type { EventVisibilityInput } from "./eventVisibility.js";

export interface ApplicationOfCitizen {
  readonly id: string;
  readonly citizenId: string;
}

interface CloseOpenApplicationsInput {
  readonly eventId: Event["id"];
  /** All open applications of the event without it */
  readonly citizenIds?: readonly Citizen["id"][];
  /** The manager, or the applicant who withdraws the own application */
  readonly actorId: Citizen["id"] | null;
  readonly closedAt: Date;
}

const buildOpenApplicationsWhere = ({
  eventId,
  citizenIds,
}: CloseOpenApplicationsInput): Prisma.EventApplicationWhereInput => ({
  eventId,
  ...(citizenIds ? { citizenId: { in: [...citizenIds] } } : {}),
  ...OPEN_APPLICATION_WHERE,
});

/**
 * Withdraws the open applications of the citizens at the event and writes an
 * activity entry for each of them. Takes the transaction client, thus the
 * entries commit together with the change that withdrew the applications.
 */
export const withdrawOpenApplications = async (
  transaction: Prisma.TransactionClient,
  input: CloseOpenApplicationsInput,
): Promise<ApplicationOfCitizen[]> => {
  const withdrawn = await transaction.eventApplication.updateManyAndReturn({
    where: buildOpenApplicationsWhere(input),
    data: {
      withdrawnAt: input.closedAt,
      withdrawnById: input.actorId,
    },
    select: { id: true, citizenId: true },
  });

  for (const application of withdrawn)
    await createEventActivity(transaction, {
      eventId: input.eventId,
      citizenId: input.actorId,
      type: EventActivityType.APPLICATION_WITHDRAWN,
      payload: { citizenId: application.citizenId },
    });

  return withdrawn;
};

/**
 * Approves the open applications of the citizens at the event and writes an
 * activity entry for each of them. The caller signs the citizens up, see
 * `admitApplicants()`. Gives the comments of the applications.
 */
export const approveOpenApplications = async (
  transaction: Prisma.TransactionClient,
  input: CloseOpenApplicationsInput,
) => {
  const approved = await transaction.eventApplication.updateManyAndReturn({
    where: buildOpenApplicationsWhere(input),
    data: {
      approvedAt: input.closedAt,
      approvedById: input.actorId,
    },
    select: { id: true, citizenId: true, comment: true },
  });

  for (const application of approved)
    await createEventActivity(transaction, {
      eventId: input.eventId,
      citizenId: input.actorId,
      type: EventActivityType.APPLICATION_APPROVED,
      payload: { citizenId: application.citizenId },
    });

  return approved;
};

export interface AdmittedApplicants {
  readonly approvedApplications: ApplicationOfCitizen[];
  /** The open invitations of the applicants, which the sign-ups replace */
  readonly withdrawnInvitations: InvitationOfCitizen[];
}

export const NO_ADMITTED_APPLICANTS: AdmittedApplicants = {
  approvedApplications: [],
  withdrawnInvitations: [],
};

/**
 * Approves the open applications of the citizens at the event and signs the
 * applicants up with the comments of their applications. Like the direct
 * sign-up of a manager, it withdraws the open invitations of the applicants.
 * Takes the transaction client of a write that locked the event first (see
 * `lockParticipationEnabledEvent()`).
 */
export const admitApplicants = async (
  transaction: Prisma.TransactionClient,
  input: CloseOpenApplicationsInput,
): Promise<AdmittedApplicants> => {
  const approved = await approveOpenApplications(transaction, input);
  if (approved.length <= 0) return NO_ADMITTED_APPLICANTS;

  /**
   * An applicant has no active sign-up: each own sign-up withdraws the open
   * application. `skipDuplicates` keeps the approval if a sign-up exists all
   * the same.
   */
  await transaction.eventParticipant.createMany({
    data: approved.map((application) => ({
      eventId: input.eventId,
      source: EventSource.APP,
      citizenId: application.citizenId,
      comment: application.comment,
    })),
    skipDuplicates: true,
  });

  const citizenIds = approved.map((application) => application.citizenId);

  return {
    approvedApplications: approved.map(({ id, citizenId }) => ({
      id,
      citizenId,
    })),
    withdrawnInvitations: await withdrawOpenInvitations(transaction, {
      eventId: input.eventId,
      citizenIds,
      withdrawnById: input.actorId,
      withdrawnAt: input.closedAt,
    }),
  };
};

export interface ClosedApplications extends AdmittedApplicants {
  /** The applications of the citizens who cannot see the event anymore */
  readonly withdrawnApplications: ApplicationOfCitizen[];
}

/**
 * The switch of the applications to false: approves the open applications of
 * the citizens who can still see the event, log in and get its
 * notifications (see `admitApplicants()` and `findAddableParticipantIds()`),
 * and withdraws the others. The event has the values of the update, for
 * example a new visibility. Takes the transaction client of the update that
 * locked the event.
 */
export const closeOpenApplications = async (
  transaction: Prisma.TransactionClient,
  prisma: ApplicationContext["prisma"],
  event: EventVisibilityInput & { readonly id: Event["id"] },
  {
    actorId,
    closedAt,
  }: Pick<CloseOpenApplicationsInput, "actorId" | "closedAt">,
): Promise<ClosedApplications> => {
  const openApplications = await transaction.eventApplication.findMany({
    where: { eventId: event.id, ...OPEN_APPLICATION_WHERE },
    select: { citizenId: true },
  });
  if (openApplications.length <= 0)
    return { ...NO_ADMITTED_APPLICANTS, withdrawnApplications: [] };

  const addableCitizenIds = await findAddableParticipantIds(
    prisma,
    event,
    openApplications.map((application) => application.citizenId),
  );
  const admitted = await admitApplicants(transaction, {
    eventId: event.id,
    citizenIds: addableCitizenIds,
    actorId,
    closedAt,
  });

  return {
    ...admitted,
    withdrawnApplications: await withdrawOpenApplications(transaction, {
      eventId: event.id,
      actorId,
      closedAt,
    }),
  };
};

export const buildApplicationAuditEvents = (
  type:
    | AuditEventType.EVENT_APPLICATION_CREATED
    | AuditEventType.EVENT_APPLICATION_APPROVED
    | AuditEventType.EVENT_APPLICATION_DECLINED
    | AuditEventType.EVENT_APPLICATION_WITHDRAWN,
  eventId: Event["id"],
  applications: readonly ApplicationOfCitizen[],
  createdById: string,
): AuditEventInput[] =>
  applications.map((application) => ({
    type,
    data: {
      eventId,
      citizenId: application.citizenId,
      applicationId: application.id,
    },
    createdById,
  }));

/**
 * The notifications of the applicants about the answer of a manager (see
 * `findEventCitizenRecipient()`). The actor gets no notification about the
 * own application.
 */
export const buildApplicationAnsweredNotifications = (
  eventId: Event["id"],
  applications: readonly ApplicationOfCitizen[],
  answer: EventApplicationAnswer,
  {
    reason,
    actorCitizenId,
  }: {
    readonly reason: string | null;
    readonly actorCitizenId: Citizen["id"] | null;
  },
): Notification[] =>
  applications
    .filter((application) => application.citizenId !== actorCitizenId)
    .map((application) => ({
      type: "EventApplicationAnswered",
      payload: {
        eventId,
        citizenId: application.citizenId,
        answer,
        reason,
      },
    }));
