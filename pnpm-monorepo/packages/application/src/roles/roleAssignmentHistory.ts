import type {
  Prisma,
  RoleAssignmentChangeType,
  RoleAssignmentLevelChangeType,
} from "@sam-monorepo/database/client";
import { buildCursorConditions, cursorOrderBy } from "@sam-monorepo/domain";
import {
  toActivityFilterWhere,
  type ActivitySourceInput,
} from "../activitySources.js";
import type { Actor } from "../actor.js";
import {
  CITIZEN_REFERENCE_SELECT,
  type CitizenReferenceRow,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { loadVisibleRoleIds } from "./roleVisibility.js";

const ROLE_ASSIGNMENT_CHANGE_SELECT = {
  id: true,
  roleId: true,
  type: true,
  createdAt: true,
  citizen: { select: CITIZEN_REFERENCE_SELECT },
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
} as const satisfies Prisma.RoleAssignmentChangeSelect;

export interface RoleAssignmentHistoryInput extends ActivitySourceInput {
  readonly citizenId?: string;
}

interface RoleAssignmentHistoryRow<ChangeType> {
  readonly id: string;
  readonly roleId: string;
  readonly type: ChangeType;
  readonly createdAt: Date;
  /** The citizen who got or lost the role or the level */
  readonly citizen: CitizenReferenceRow;
  /** Null for an automation */
  readonly createdBy: CitizenReferenceRow | null;
}

export type RoleAssignmentChangeRow =
  RoleAssignmentHistoryRow<RoleAssignmentChangeType>;

export type RoleAssignmentLevelChangeRow =
  RoleAssignmentHistoryRow<RoleAssignmentLevelChangeType>;

/**
 * The roles that the actor can see are the whole permission check. They are a
 * part of the query, thus a page never has fewer entries than it can show.
 */
const buildWhere = (
  visibleRoleIds: string[],
  input: RoleAssignmentHistoryInput,
) => ({
  AND: [
    {
      roleId: { in: visibleRoleIds },
      ...(input.citizenId ? { citizenId: input.citizenId } : {}),
      ...toActivityFilterWhere(input, "createdById"),
    },
    ...buildCursorConditions(
      input.position,
      input.sourceKey,
      input.direction,
      "createdAt",
    ),
  ],
});

export const findRoleAssignmentChanges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
  input: RoleAssignmentHistoryInput,
): Promise<RoleAssignmentChangeRow[]> => {
  const visibleRoleIds = await loadVisibleRoleIds(context, actor);
  if (visibleRoleIds.length <= 0) return [];

  return context.prisma.roleAssignmentChange.findMany({
    where: buildWhere(visibleRoleIds, input),
    orderBy: cursorOrderBy(input.direction, "createdAt"),
    take: input.take,
    select: ROLE_ASSIGNMENT_CHANGE_SELECT,
  });
};

export const findRoleAssignmentLevelChanges = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Pick<Actor, "authorize">,
  input: RoleAssignmentHistoryInput,
): Promise<RoleAssignmentLevelChangeRow[]> => {
  const visibleRoleIds = await loadVisibleRoleIds(context, actor);
  if (visibleRoleIds.length <= 0) return [];

  return context.prisma.roleAssignmentLevelChange.findMany({
    where: buildWhere(visibleRoleIds, input),
    orderBy: cursorOrderBy(input.direction, "createdAt"),
    take: input.take,
    select: ROLE_ASSIGNMENT_CHANGE_SELECT,
  });
};
