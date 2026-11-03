import {
  findEventBriefingUpdatedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventBriefingUpdatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId: Citizen["id"] | null;
};

/**
 * A manager announced a change of the briefing. The current audience of the
 * briefing and the organizers get it, except the manager who announced it
 * (see `findEventBriefingUpdatedRecipients()`).
 */
export const EventBriefingUpdatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventBriefingUpdatedRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
  };
  const text = getEventBriefingUpdatedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_briefing_updated" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/briefing`,
    })),
  );
};
