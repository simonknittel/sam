import { EventVisibility } from "@sam-monorepo/database/browser";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { isRoleVisible } from "../roles/roleVisibility.js";
import { EventErrorMessage } from "./eventErrors.js";

/**
 * A role that the event does not have yet must be visible for the actor, like
 * in the role picker of the form
 */
export const resolveVisibilityRoleIds = async (
  context: ApplicationContext,
  actor: Actor,
  visibility: EventVisibility,
  roleIds: readonly string[],
  previousRoleIds: readonly string[] = [],
): Promise<string[]> => {
  if (visibility !== EventVisibility.RESTRICTED) return [];

  const uniqueRoleIds = Array.from(new Set(roleIds));
  if (uniqueRoleIds.length <= 0)
    throw new ValidationError(EventErrorMessage.NoVisibilityRole);

  const previousRoleIdSet = new Set(previousRoleIds);
  if (
    uniqueRoleIds.some(
      (roleId) =>
        !previousRoleIdSet.has(roleId) && !isRoleVisible(actor, roleId),
    )
  )
    throw new ValidationError(EventErrorMessage.UnknownVisibilityRole);

  const existingRoleCount = await context.prisma.role.count({
    where: { id: { in: uniqueRoleIds } },
  });
  if (existingRoleCount !== uniqueRoleIds.length)
    throw new ValidationError(EventErrorMessage.UnknownVisibilityRole);

  return uniqueRoleIds;
};
