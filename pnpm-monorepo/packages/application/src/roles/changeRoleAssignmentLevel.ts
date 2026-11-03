import { RoleAssignmentLevelChangeType } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType, type PermissionSet } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ConflictError,
  NotFoundError,
  rethrowRecordNotFound,
} from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { RoleAssignmentErrorMessage } from "./roleErrors.js";

export const changeRoleAssignmentLevelInputSchema = z.object({
  citizen_id: idSchema,
  role_id: idSchema,
});

export type ChangeRoleAssignmentLevelInput = z.infer<
  typeof changeRoleAssignmentLevelInputSchema
>;

export interface ChangeRoleAssignmentLevelOutput {
  readonly citizen_id: string;
  readonly role_id: string;
  readonly current_level: number | null;
  /**
   * False when the change is saved, but the notifications failed. The change
   * stands, thus the caller must not make it again.
   */
  readonly notifications_sent: boolean;
}

interface LevelChange {
  readonly spanName: string;
  readonly operation: PermissionSet["operation"];
  readonly changeType: RoleAssignmentLevelChangeType;
  readonly auditEventType:
    | AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED
    | AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED;
  readonly getNextLevel: (
    currentLevel: number | null,
    maxLevel: number,
  ) => Prisma.RoleAssignmentUpdateInput["currentLevel"];
}

/**
 * The increase and the decrease are mirrored: they differ only in the
 * permission, the level arithmetic and the types of the history row and of
 * the audit event
 */
const changeRoleAssignmentLevel = (
  context: ApplicationContext,
  actor: Actor,
  input: ChangeRoleAssignmentLevelInput,
  levelChange: LevelChange,
): Promise<ChangeRoleAssignmentLevelOutput> =>
  withSpan(context, levelChange.spanName, async () => {
    const actorCitizen = requireCitizen(actor);
    requirePermission(actor, "otherRole", levelChange.operation, [
      { key: "roleId", value: input.role_id },
    ]);

    const where = {
      citizenId_roleId: { citizenId: input.citizen_id, roleId: input.role_id },
    };

    const roleAssignment = await context.prisma.roleAssignment.findUnique({
      where,
      select: { currentLevel: true, role: { select: { maxLevel: true } } },
    });
    if (!roleAssignment)
      throw new NotFoundError(RoleAssignmentErrorMessage.NotAssigned);

    const { maxLevel } = roleAssignment.role;
    if (!maxLevel)
      throw new ConflictError(RoleAssignmentErrorMessage.RoleHasNoLevels);

    const [updatedRoleAssignment] = await rethrowRecordNotFound(
      () =>
        context.prisma.$transaction([
          context.prisma.roleAssignment.update({
            where,
            data: {
              currentLevel: levelChange.getNextLevel(
                roleAssignment.currentLevel,
                maxLevel,
              ),
              currentLevelUpdatedAt: context.now(),
            },
            select: { currentLevel: true },
          }),
          context.prisma.roleAssignmentLevelChange.create({
            data: {
              citizenId: input.citizen_id,
              roleId: input.role_id,
              type: levelChange.changeType,
              createdById: actorCitizen.id,
            },
            select: { id: true },
          }),
        ]),
      RoleAssignmentErrorMessage.NotAssigned,
    );

    await context.audit.create([
      {
        type: levelChange.auditEventType,
        data: { citizenId: input.citizen_id, roleId: input.role_id },
        createdById: actor.userId,
      },
    ]);

    // Only an increase below the maximum level makes the level rise. A
    // missing level counts as level 0.
    const levelRose =
      (updatedRoleAssignment.currentLevel ?? 0) >
      (roleAssignment.currentLevel ?? 0);
    const notifications =
      levelRose && input.citizen_id !== actorCitizen.id
        ? [
            {
              type: "RoleLevelIncreased",
              payload: { citizenId: input.citizen_id, roleId: input.role_id },
            },
          ]
        : [];

    return {
      citizen_id: input.citizen_id,
      role_id: input.role_id,
      current_level: updatedRoleAssignment.currentLevel,
      notifications_sent:
        notifications.length > 0
          ? await triggerNotificationsAfterSave(context, notifications)
          : true,
    };
  });

/**
 * Increases the level of a citizen in a role with levels by one, up to the
 * maximum level, and notifies the citizen when the level rose. Requires a
 * citizen and `otherRole;assign` for the role.
 *
 * @throws NotFoundError when the citizen does not have the role
 * @throws ConflictError when the role has no levels
 */
export const increaseRoleAssignmentLevel = (
  context: ApplicationContext,
  actor: Actor,
  input: ChangeRoleAssignmentLevelInput,
) =>
  changeRoleAssignmentLevel(context, actor, input, {
    spanName: "increaseRoleAssignmentLevel",
    operation: "assign",
    changeType: RoleAssignmentLevelChangeType.UP,
    auditEventType: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
    getNextLevel: (currentLevel, maxLevel) => {
      if (currentLevel === null) return 1;
      if (currentLevel >= maxLevel) return currentLevel;

      return { increment: 1 };
    },
  });

/**
 * Decreases the level of a citizen in a role with levels by one, down to 0.
 * Requires a citizen and `otherRole;dismiss` for the role.
 *
 * @throws NotFoundError when the citizen does not have the role
 * @throws ConflictError when the role has no levels
 */
export const decreaseRoleAssignmentLevel = (
  context: ApplicationContext,
  actor: Actor,
  input: ChangeRoleAssignmentLevelInput,
) =>
  changeRoleAssignmentLevel(context, actor, input, {
    spanName: "decreaseRoleAssignmentLevel",
    operation: "dismiss",
    changeType: RoleAssignmentLevelChangeType.DOWN,
    auditEventType: AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED,
    getNextLevel: (currentLevel) =>
      currentLevel && currentLevel > 0 ? { decrement: 1 } : 0,
  });
