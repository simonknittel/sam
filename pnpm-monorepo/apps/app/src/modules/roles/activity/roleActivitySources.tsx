import { prisma } from "@/db";
import type { ActivitySource } from "@/modules/activity/utils/activityEntry";
import type { ActivityFilters } from "@/modules/activity/utils/activityFilterParams";
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
import { RoleActivitySourceKey } from "./roleActivityTypes";

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
 * The conditions both role sources share. Which roles the reader may see is
 * the whole permission gate here, and it runs as part of the query rather
 * than afterwards so a page never comes back short of entries.
 */
const buildWhere = (
  visibleRoleIds: string[],
  { citizenId, filters }: Input,
) => ({
  roleId: { in: visibleRoleIds },
  ...(citizenId ? { citizenId } : {}),
  ...(filters?.actorIds ? { createdById: { in: filters.actorIds } } : {}),
  ...(filters && Object.keys(filters.createdAt).length > 0
    ? { createdAt: filters.createdAt }
    : {}),
});

/** `null` when the reader may not see a single role — nothing to query then. */
const getVisibleRoleIds = async () => {
  const visibleRoles = await getVisibleRoles();
  return visibleRoles.length > 0 ? visibleRoles.map((role) => role.id) : null;
};

export const createRoleAssignmentSource = (input: Input = {}): ActivitySource =>
  withTrace(
    "roleAssignmentActivitySource",
    async ({ position, direction, take }: MergedCursorSourceInput) => {
      const visibleRoleIds = await getVisibleRoleIds();
      if (!visibleRoleIds) return [];

      const changes = await prisma.roleAssignmentChange.findMany({
        where: {
          AND: [
            buildWhere(visibleRoleIds, input),
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
      const visibleRoleIds = await getVisibleRoleIds();
      if (!visibleRoleIds) return [];

      const changes = await prisma.roleAssignmentLevelChange.findMany({
        where: {
          AND: [
            buildWhere(visibleRoleIds, input),
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
