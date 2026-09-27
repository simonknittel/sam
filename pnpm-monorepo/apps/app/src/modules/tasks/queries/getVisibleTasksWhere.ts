import {
  getEffectiveRoles,
  requireAuthentication,
} from "@/modules/auth/server";
import { TaskVisibility, type Prisma } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";

/**
 * The tasks the current viewer may see, as a Prisma where fragment. The
 * filter is part of each task query: a filter after the query would make a
 * page or a "latest 5" list shorter than its size.
 *
 * The required roles compare with the effective roles of the viewer: an
 * inherited role counts, and a role with levels counts only at its maximum
 * level.
 */
export const getVisibleTasksWhere =
  async (): Promise<Prisma.TaskWhereInput> => {
    const authentication = await requireAuthentication();
    if (!authentication.session.entity) forbidden();

    if (await authentication.authorize("task", "manage")) return {};

    const citizenId = authentication.session.entity.id;
    const { roleIds } = await getEffectiveRoles(citizenId);

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
          requiredRoles: { some: { id: { in: Array.from(roleIds) } } },
        },
        {
          visibility: TaskVisibility.PUBLIC,
          OR: [{ hiddenForOtherRoles: false }, { requiredRoles: { none: {} } }],
        },
      ],
    };
  };
