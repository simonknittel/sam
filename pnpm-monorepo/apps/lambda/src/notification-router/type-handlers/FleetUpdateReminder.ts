import {
  findFleetUpdateReminderRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen } from "@sam-monorepo/database";
import {
  getFleetUpdateReminderText,
  MY_SHIPS_PATH,
} from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Citizen["id"];
}

export const FleetUpdateReminderHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const recipient = await findFleetUpdateReminderRecipient(context, {
    citizenId: payload.citizenId,
  });
  if (!recipient) return;

  await publishNotifications(context, [
    {
      receiverId: recipient.citizenId,
      notificationType: "fleet_update_reminder" as const,
      payload: {},
      ...getFleetUpdateReminderText(),
      url: MY_SHIPS_PATH,
    },
  ]);
};
