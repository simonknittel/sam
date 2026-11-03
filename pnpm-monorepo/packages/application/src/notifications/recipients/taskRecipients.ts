import type { PermissionSet } from "@sam-monorepo/domain";
import { LOGIN_MANAGE_PERMISSION_SET } from "../../auth/clearedCitizens.js";
import { findCitizenIdsWithPermissions } from "../../auth/effectivePermissionsOfCitizens.js";
import type { ApplicationContext } from "../../context.js";
import type { Recipient } from "./recipient.js";

/**
 * The receiver of a task notification must be able to log in and to open
 * tasks. The admin flag of a user does not count: the recipient rules read
 * only the roles.
 */
export const TASK_RECEIVER_PERMISSION_SETS = [
  LOGIN_MANAGE_PERMISSION_SET,
  { resource: "task", operation: "read" },
] as const satisfies readonly PermissionSet[];

/**
 * The citizens of the list who can receive a task notification (see
 * `TASK_RECEIVER_PERMISSION_SETS`), except the citizen who caused the
 * change. A null in the list is a deleted citizen, for example the deleted
 * creator of a task.
 */
export const findTaskReceivers = async (
  context: ApplicationContext,
  citizenIds: readonly (string | null)[],
  actorId: string | null,
): Promise<Recipient[]> => {
  const candidateIds = citizenIds.filter(
    (citizenId): citizenId is string =>
      citizenId !== null && citizenId !== actorId,
  );
  if (candidateIds.length <= 0) return [];

  const recipientIds = await findCitizenIdsWithPermissions(
    context,
    { id: { in: candidateIds } },
    TASK_RECEIVER_PERMISSION_SETS,
  );

  return Array.from(recipientIds, (citizenId) => ({ citizenId }));
};
