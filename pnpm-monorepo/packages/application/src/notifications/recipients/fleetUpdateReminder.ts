import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindFleetUpdateReminderRecipientInput {
  readonly citizenId: string;
}

/**
 * The citizen of a fleet update reminder, when the citizen can log in and
 * manage their own ships on the page that the reminder links to. Null for a
 * citizen without these permissions.
 */
export const findFleetUpdateReminderRecipient = async (
  context: ApplicationContext,
  input: FindFleetUpdateReminderRecipientInput,
): Promise<Recipient | null> => {
  const isRecipient = await isCitizenWithPermissions(context, input.citizenId, [
    LOGIN_MANAGE_PERMISSION_SET,
    { resource: "ship", operation: "manage" },
  ]);
  if (!isRecipient) return null;

  return { citizenId: input.citizenId };
};
