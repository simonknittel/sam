import type { Event } from "@sam-monorepo/database/client";
import {
  EventInvitationAnswer,
  EventParticipationChange,
} from "@sam-monorepo/domain";
import type { Notification } from "../context.js";
import { buildInvitationAnsweredNotification } from "./eventInvitations.js";
import type { OwnSignUp } from "./ownParticipation.js";

/**
 * The organizers hear about a sign-up, or about a cancellation that vacated
 * no position, only from 24 hours before the start of the event. Before that
 * time, such a change needs no fast action of the organizers.
 */
const PARTICIPATION_CHANGE_NOTICE_PERIOD_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const isInNoticePeriod = (event: Pick<Event, "startTime">, now: Date) =>
  now.getTime() >=
  event.startTime.getTime() -
    PARTICIPATION_CHANGE_NOTICE_PERIOD_IN_MILLISECONDS;

/**
 * The notifications of the organizers about new sign-ups (see
 * `findEventOrganizerRecipients()`). The use case calls it after the save,
 * with the time of the save.
 */
export const buildSignUpNotifications = (
  event: Pick<Event, "id" | "startTime">,
  now: Date,
  citizenIds: readonly string[],
): Notification[] =>
  isInNoticePeriod(event, now)
    ? citizenIds.map((citizenId) => ({
        type: "EventParticipationChanged",
        payload: {
          eventId: event.id,
          citizenId,
          change: EventParticipationChange.SignedUp,
        },
      }))
    : [];

/**
 * The notifications of the organizers about an own sign-up: about the
 * accepted invitation at each time, else like `buildSignUpNotifications()`
 */
export const buildOwnSignUpNotifications = (
  event: Pick<Event, "id" | "startTime">,
  now: Date,
  signUp: OwnSignUp,
): Notification[] =>
  signUp.acceptedInvitationId
    ? [
        buildInvitationAnsweredNotification(
          event.id,
          signUp.citizenId,
          EventInvitationAnswer.Accepted,
          signUp.comment,
        ),
      ]
    : buildSignUpNotifications(event, now, [signUp.citizenId]);

/** The cancellation of a participant, not the removal by a manager */
export interface OwnCancellation {
  readonly citizenId: string;
  /** The names of the lineup positions that the citizen held before */
  readonly vacatedPositionNames: readonly string[];
}

/**
 * The notifications of the organizers about cancellations (see
 * `findEventOrganizerRecipients()`). A cancellation that vacated positions
 * notifies at each time, because the organizers must fill the positions
 * again. The use case calls it after the save, with the time of the save.
 */
export const buildCancellationNotifications = (
  event: Pick<Event, "id" | "startTime">,
  now: Date,
  cancellations: readonly OwnCancellation[],
): Notification[] => {
  const isNoticed = isInNoticePeriod(event, now);

  return cancellations.flatMap(
    ({ citizenId, vacatedPositionNames }): Notification[] => {
      if (vacatedPositionNames.length > 0)
        return [
          {
            type: "EventPositionVacated",
            payload: {
              eventId: event.id,
              citizenId,
              positionNames: vacatedPositionNames,
            },
          },
        ];

      if (!isNoticed) return [];

      return [
        {
          type: "EventParticipationChanged",
          payload: {
            eventId: event.id,
            citizenId,
            change: EventParticipationChange.Cancelled,
          },
        },
      ];
    },
  );
};
