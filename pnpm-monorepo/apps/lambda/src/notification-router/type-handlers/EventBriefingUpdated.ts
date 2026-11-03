import {
  findEventBriefingAudienceRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventBriefingUpdatedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  announcedById: Citizen["id"];
};

/**
 * A manager announced a change of the briefing. The current audience of the
 * briefing gets it, except the manager who announced it (see
 * `findEventBriefingAudienceRecipients()`).
 */
export const EventBriefingUpdatedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventBriefingAudienceRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.announcedById,
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
