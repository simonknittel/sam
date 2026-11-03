import {
  findRoleLevelIncreasedRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Role } from "@sam-monorepo/database";
import { getRoleLevelIncreasedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Citizen["id"];
  roleId: Role["id"];
}

export const RoleLevelIncreasedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findRoleLevelIncreasedRecipient(context, {
    citizenId: payload.citizenId,
    roleId: payload.roleId,
  });
  if (!result) return;

  const notificationPayload = {
    roleId: result.role.id,
    roleName: result.role.name,
    level: result.level,
    maxLevel: result.role.maxLevel,
  };
  const text = getRoleLevelIncreasedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "role_level_increased" as const,
      payload: notificationPayload,
      ...text,
    })),
  );
};
