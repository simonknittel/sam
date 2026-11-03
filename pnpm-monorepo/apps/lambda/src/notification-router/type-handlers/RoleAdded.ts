import {
  findRoleAddedRecipient,
  type ApplicationContext,
} from "@sam-monorepo/application";
import { type Citizen, type Role } from "@sam-monorepo/database";
import { getRoleAddedText } from "@sam-monorepo/domain";
import { publishNotifications } from "../publish";

interface Payload {
  citizenId: Citizen["id"];
  roleId: Role["id"];
}

export const RoleAddedHandler = async (
  context: ApplicationContext,
  payload: Payload,
) => {
  const result = await findRoleAddedRecipient(context, {
    citizenId: payload.citizenId,
    roleId: payload.roleId,
  });
  if (!result) return;

  const notificationPayload = {
    roleId: result.role.id,
    roleName: result.role.name,
  };
  const text = getRoleAddedText(notificationPayload);

  await publishNotifications(
    context,
    result.recipients.map((recipient) => ({
      receiverId: recipient.citizenId,
      notificationType: "role_added" as const,
      payload: notificationPayload,
      ...text,
    })),
  );
};
