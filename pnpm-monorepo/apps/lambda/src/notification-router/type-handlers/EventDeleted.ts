import {
  findEventDeletedRecipients,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Event } from "@sam-monorepo/database";
import { publishNotifications } from "../publish.js";

type Payload = {
  eventId: Event["id"];
  actorCitizenId?: Citizen["id"] | null;
};

export const EventDeletedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findEventDeletedRecipients(context, {
    eventId: payload.eventId,
    excludedCitizenId: payload.actorCitizenId,
  });
  if (!result) return;

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "event_deleted" as const,
      payload: { eventName: result.event.name },
      title: "Event gelöscht",
      body: result.event.name,
    })),
  );
};
