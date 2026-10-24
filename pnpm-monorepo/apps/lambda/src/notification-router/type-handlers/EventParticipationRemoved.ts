import {
  findEventParticipationRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
  reason: string | null;
};

/**
 * The message links to the event page, thus only a citizen who can see the
 * event now gets it (see `findEventParticipationRecipient()`)
 */
export const EventParticipationRemovedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventParticipationRecipient(context, {
    eventId: payload.eventId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  const body = `Du wurdest vom Event "${result.event.name}" entfernt.`;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_participation_removed" as const,
      payload: {
        eventId: result.event.id,
        eventName: result.event.name,
        reason: payload.reason,
      },
      title: "Vom Event entfernt",
      body: payload.reason ? `${body} Grund: ${payload.reason}` : body,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
