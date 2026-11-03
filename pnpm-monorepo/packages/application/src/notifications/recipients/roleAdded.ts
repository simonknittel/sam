import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { getRoleReceiverPermissionSets } from "./roleRecipients.js";

export interface FindRoleAddedRecipientInput {
  readonly citizenId: string;
  readonly roleId: string;
}

export interface RoleAddedRecipients {
  readonly role: { readonly id: string; readonly name: string };
  readonly recipients: Recipient[];
}

/**
 * The citizen who got the role, when the citizen can log in and read the
 * added role (see `getRoleReceiverPermissionSets()`). Null when the role does
 * not exist.
 */
export const findRoleAddedRecipient = async (
  context: ApplicationContext,
  input: FindRoleAddedRecipientInput,
): Promise<RoleAddedRecipients | null> => {
  const [role, isRecipient] = await Promise.all([
    context.prisma.role.findUnique({
      where: { id: input.roleId },
      select: {
        name: true,
      },
    }),
    isCitizenWithPermissions(
      context,
      input.citizenId,
      getRoleReceiverPermissionSets(input.roleId),
    ),
  ]);
  if (!role) return null;

  return {
    role: { id: input.roleId, name: role.name },
    recipients: isRecipient ? [{ citizenId: input.citizenId }] : [],
  };
};
