import {
  findEventBriefingAudienceRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { getEventBriefingPublishedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId?: Citizen["id"] | null;
};

/**
 * The app sends this notification one time for each event: when the read
 * scope of the briefing first opens it to more citizens than the managers.
 * See `findEventBriefingAudienceRecipients()` for the recipients.
 */
export const EventBriefingPublishedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventBriefingAudienceRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  const notificationPayload = {
    eventId: result.event.id,
    eventName: result.event.name,
  };
  const text = getEventBriefingPublishedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_briefing_published" as const,
      payload: notificationPayload,
      ...text,
      url: `/app/events/${result.event.id}/briefing`,
    })),
  );
};
