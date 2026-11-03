import { isCitizenWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";
import { getRoleReceiverPermissionSets } from "./roleRecipients.js";

export interface FindRoleLevelIncreasedRecipientInput {
  readonly citizenId: string;
  readonly roleId: string;
}

export interface RoleLevelIncreasedRecipients {
  readonly role: {
    readonly id: string;
    readonly name: string;
    readonly maxLevel: number;
  };
  /** The current level of the citizen in the role */
  readonly level: number;
  readonly recipients: Recipient[];
}

/**
 * The citizen whose level in the role rose, with the rule of
 * `findRoleAddedRecipient()`. Null when the citizen does not have the role
 * or a level in it any more, or the role has no levels.
 */
export const findRoleLevelIncreasedRecipient = async (
  context: ApplicationContext,
  input: FindRoleLevelIncreasedRecipientInput,
): Promise<RoleLevelIncreasedRecipients | null> => {
  const [roleAssignment, isRecipient] = await Promise.all([
    context.prisma.roleAssignment.findUnique({
      where: {
        citizenId_roleId: {
          citizenId: input.citizenId,
          roleId: input.roleId,
        },
      },
      select: {
        currentLevel: true,
        role: { select: { name: true, maxLevel: true } },
      },
    }),
    isCitizenWithPermissions(
      context,
      input.citizenId,
      getRoleReceiverPermissionSets(input.roleId),
    ),
  ]);
  if (!roleAssignment?.role.maxLevel || roleAssignment.currentLevel === null)
    return null;

  return {
    role: {
      id: input.roleId,
      name: roleAssignment.role.name,
      maxLevel: roleAssignment.role.maxLevel,
    },
    level: roleAssignment.currentLevel,
    recipients: isRecipient ? [{ citizenId: input.citizenId }] : [],
  };
};
