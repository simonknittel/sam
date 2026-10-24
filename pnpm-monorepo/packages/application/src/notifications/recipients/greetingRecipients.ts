import { CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

export interface FindGreetingRecipientInput {
  readonly citizenId: string;
}

/**
 * The citizen of a birthday or New Year greeting. Nobody else is told about
 * it, thus the only condition is that the citizen can open the app and read
 * the greeting. Minutes can pass between the job and the delivery, thus the
 * permission is checked again here. Null when the citizen cannot log in.
 */
export const findGreetingRecipient = async (
  context: ApplicationContext,
  input: FindGreetingRecipientInput,
): Promise<Recipient | null> => {
  const citizen = await context.prisma.citizen.findFirst({
    where: {
      AND: [{ id: input.citizenId }, CAN_LOGIN_CITIZEN_WHERE],
    },
    select: {
      id: true,
    },
  });
  if (!citizen) return null;

  return { citizenId: citizen.id };
};

/**
 * The citizen of the welcome, on the first day the citizen can open the app.
 * Time can pass between the request and the delivery, thus the permission is
 * checked again here.
 *
 * The check uses the effective roles of the citizen (inherited roles, level
 * gate and negation), the same rule as the session of the app that sets the
 * marker (`Citizen.welcomedAt`). A different rule could set the marker
 * without a notification, and the citizen gets no second welcome. Null when
 * the citizen cannot log in.
 */
export const findWelcomeGreetingRecipient = async (
  context: ApplicationContext,
  input: FindGreetingRecipientInput,
): Promise<Recipient | null> => {
  const canLogIn = await isCitizenWithPermissions(context, input.citizenId, [
    LOGIN_MANAGE_PERMISSION_SET,
  ]);
  if (!canLogIn) return null;

  return { citizenId: input.citizenId };
};
