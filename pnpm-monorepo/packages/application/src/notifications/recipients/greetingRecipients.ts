import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindGreetingRecipientInput {
  readonly citizenId: string;
}

/**
 * Time can pass between the request and the delivery, thus the permission is
 * checked again here.
 *
 * The check uses the effective roles of the citizen, the same rule as the
 * greeting jobs and as the session of the app that sets the marker of the
 * welcome (`Citizen.welcomedAt`). A different rule could set the marker without
 * a notification, and the citizen gets no second welcome.
 */
export const findGreetingRecipient = async (
  context: ApplicationContext,
  input: FindGreetingRecipientInput,
): Promise<Recipient | null> => {
  const canLogIn = await isCitizenWithPermissions(context, input.citizenId, [
    LOGIN_MANAGE_PERMISSION_SET,
  ]);
  if (!canLogIn) return null;

  return { citizenId: input.citizenId };
};
