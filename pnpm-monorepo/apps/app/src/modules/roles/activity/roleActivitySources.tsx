import { prisma } from "@/db";
import type { ActivitySource } from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import {
  buildCursorConditions,
  cursorOrderBy,
  type MergedCursorSourceInput,
} from "@/modules/common/CursorPagination/mergedCursor";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  RoleAssignmentChangeType,
  RoleAssignmentLevelChangeType,
  type Entity,
} from "@sam-monorepo/database/client";
import { SingleRoleBadge } from "../components/SingleRoleBadge";
import { getVisibleRoles } from "../utils/getRoles";

export enum RoleActivitySourceKey {
  Assignment = "role-assignment",
  AssignmentLevel = "role-assignment-level",
}

interface Input {
  /** Restricts the source to one citizen's history. */
  readonly citizenId?: Entity["id"];
  /** Whether the citizen the entry is about gets its own column. */
  readonly withTarget?: boolean;
  readonly filters?: ActivityFilters;
}

const CHANGE_SELECT = {
  id: true,
  roleId: true,
  type: true,
  createdAt: true,
  citizen: {
    select: {
      id: true,
      handle: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      handle: true,
    },
  },
} as const;

/**
 * The conditions both role sources share. The visible-roles check runs as
 * part of the query rather than afterwards so a page never comes back short
 * of entries just because the reader may not see some roles.
 */
const buildWhere = async ({ citizenId, filters }: Input) => {
  const visibleRoles = await getVisibleRoles();

  return {
    roleId: { in: visibleRoles.map((role) => role.id) },
    ...(citizenId ? { citizenId } : {}),
    ...(filters?.actorIds ? { createdById: { in: filters.actorIds } } : {}),
    ...(filters && Object.keys(filters.createdAt).length > 0
      ? { createdAt: filters.createdAt }
      : {}),
  };
};

export const createRoleAssignmentSource = (input: Input = {}): ActivitySource =>
  withTrace(
    "roleAssignmentActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherRole", "read"))) return [];

      const where = await buildWhere(input);

      const changes = await prisma.roleAssignmentChange.findMany({
        where: {
          AND: [
            where,
            ...buildCursorConditions(
              position,
              RoleActivitySourceKey.Assignment,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        select: CHANGE_SELECT,
      });

      return changes.map((change) => ({
        sourceKey: RoleActivitySourceKey.Assignment,
        id: change.id,
        date: change.createdAt,
        actor: change.createdBy,
        target: input.withTarget ? (
          <CitizenLink citizen={change.citizen} />
        ) : undefined,
        message: buildAssignmentMessage(change.type, change.roleId),
      }));
    },
  );

export const createRoleAssignmentLevelSource = (
  input: Input = {},
): ActivitySource =>
  withTrace(
    "roleAssignmentLevelActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("otherRole", "read"))) return [];

      const where = await buildWhere(input);

      const changes = await prisma.roleAssignmentLevelChange.findMany({
        where: {
          AND: [
            where,
            ...buildCursorConditions(
              position,
              RoleActivitySourceKey.AssignmentLevel,
              direction,
            ),
          ],
        },
        orderBy: cursorOrderBy(direction),
        take,
        select: CHANGE_SELECT,
      });

      return changes.map((change) => ({
        sourceKey: RoleActivitySourceKey.AssignmentLevel,
        id: change.id,
        date: change.createdAt,
        actor: change.createdBy,
        target: input.withTarget ? (
          <CitizenLink citizen={change.citizen} />
        ) : undefined,
        message: buildLevelMessage(change.type, change.roleId),
      }));
    },
  );

const buildAssignmentMessage = (
  type: RoleAssignmentChangeType,
  roleId: string,
) => {
  switch (type) {
    case RoleAssignmentChangeType.ADD:
      return (
        <>
          Rolle <SingleRoleBadge roleId={roleId} /> hinzugefügt
        </>
      );

    case RoleAssignmentChangeType.REMOVE:
      return (
        <>
          Rolle <SingleRoleBadge roleId={roleId} /> entfernt
        </>
      );

    default:
      throw new Error(`Unknown change type: ${type satisfies never}`);
  }
};

const buildLevelMessage = (
  type: RoleAssignmentLevelChangeType,
  roleId: string,
) => {
  switch (type) {
    case RoleAssignmentLevelChangeType.UP:
      return (
        <>
          Level der Rolle <SingleRoleBadge roleId={roleId} /> erhöht
        </>
      );

    case RoleAssignmentLevelChangeType.DOWN:
      return (
        <>
          Level der Rolle <SingleRoleBadge roleId={roleId} /> verringert
        </>
      );

    default:
      throw new Error(`Unknown change type: ${type satisfies never}`);
  }
};
