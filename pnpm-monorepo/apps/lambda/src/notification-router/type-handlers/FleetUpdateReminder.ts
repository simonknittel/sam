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

/**
 * Asks the citizen to check their own ships. The app sends the request on
 * the first visit after a long absence (see
 * `FLEET_UPDATE_REMINDER_ABSENCE_MONTHS`).
 */
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
