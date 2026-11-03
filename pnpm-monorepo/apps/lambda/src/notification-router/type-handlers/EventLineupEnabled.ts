import {
  findEventLineupEnabledRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Event } from "@sam-monorepo/database";
import { getEventLineupEnabledText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
};

export const EventLineupEnabledHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventLineupEnabledRecipients(context, {
    eventId: payload.eventId,
  });
  if (!result) return;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => {
      const notificationPayload = {
        eventId: result.event.id,
        eventName: result.event.name,
        // Without positions, the field is missing like in the older rows
        ...(recipient.positionNames.length > 0
          ? { positionNames: recipient.positionNames }
          : {}),
      };

      return {
        receiverId: recipient.citizenId,
        notificationType: "event_lineup_enabled" as const,
        payload: notificationPayload,
        ...getEventLineupEnabledText(notificationPayload),
        url: `/app/events/${result.event.id}/lineup`,
      };
    }),
  );
};
