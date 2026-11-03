import {
  findEventCitizenRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  citizenId: Citizen["id"];
};

export const EventParticipationAddedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventCitizenRecipient(context, {
    eventId: payload.eventId,
    citizenId: payload.citizenId,
  });
  if (!result) return;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_participation_added" as const,
      payload: { eventId: result.event.id, eventName: result.event.name },
      title: "Zum Event hinzugefügt",
      body: `Du wurdest zum Event "${result.event.name}" hinzugefügt.`,
      url: `/app/events/${result.event.id}`,
    })),
  );
};
