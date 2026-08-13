"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { RoleAssignmentLevelChangeType } from "@sam-monorepo/database/client";
import { createRoleAssignmentLevelAction } from "../utils/createRoleAssignmentLevelAction";

export const decreaseRoleAssignmentLevel = createRoleAssignmentLevelAction(
  "decreaseRoleAssignmentLevel",
  {
    permission: "dismiss",
    changeType: RoleAssignmentLevelChangeType.DOWN,
    auditEventType: AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED,
    nextLevel: (roleAssignment) =>
      roleAssignment.currentLevel
        ? roleAssignment.currentLevel > 0
          ? { decrement: 1 }
          : 0
        : 0,
  },
);
