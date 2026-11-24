import { TaskVisibility } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { requireCitizen, type Actor } from "../actor.js";

export const getOpenTasksWhere = (now: Date): Prisma.TaskWhereInput => ({
  cancelledAt: null,
  deletedAt: null,
  completedAt: null,
  OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
});

/**
 * The tasks the actor may see, as a Prisma where fragment. The filter is
 * part of each task query: a filter after the query would make a page or a
 * "latest 5" list shorter than its size.
 *
 * The required roles compare with the effective roles of the citizen: an
 * inherited role counts, and a role with levels counts only at its maximum
 * level.
 *
 * The task features need a citizen: the visibility and the assignments use
 * it.
 */
export const getVisibleTasksWhere = (actor: Actor): Prisma.TaskWhereInput => {
  const citizenId = requireCitizen(actor).id;

  if (actor.authorize("task", "manage")) return {};

  return {
    OR: [
      { createdById: citizenId },
      { completionists: { some: { id: citizenId } } },
      { assignments: { some: { citizenId } } },
      /**
       * A task with required roles that is hidden for other roles is
       * visible only to these roles, also if it is public.
       */
      {
        hiddenForOtherRoles: true,
        requiredRoles: { some: { id: { in: Array.from(actor.roleIds) } } },
      },
      {
        visibility: TaskVisibility.PUBLIC,
        OR: [{ hiddenForOtherRoles: false }, { requiredRoles: { none: {} } }],
      },
    ],
  };
};
