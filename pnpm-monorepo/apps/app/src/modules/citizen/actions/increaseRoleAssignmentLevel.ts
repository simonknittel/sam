"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { RoleAssignmentLevelChangeType } from "@sam-monorepo/database/client";
import { createRoleAssignmentLevelAction } from "../utils/createRoleAssignmentLevelAction";

export const increaseRoleAssignmentLevel = createRoleAssignmentLevelAction(
  "increaseRoleAssignmentLevel",
  {
    permission: "assign",
    changeType: RoleAssignmentLevelChangeType.UP,
    auditEventType: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
    nextLevel: (roleAssignment) =>
      roleAssignment.currentLevel === null
        ? 1
        : roleAssignment.currentLevel >= roleAssignment.role.maxLevel
          ? roleAssignment.currentLevel
          : { increment: 1 },
  },
);
