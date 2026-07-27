"use client";

import { type FlowNode, FlowNodeType } from "@/generated/prisma/browser";
import type { AdditionalDataType } from "./additionalDataType";
import { isUnlocked } from "./helpers";

export const getNodeType = (
  node: FlowNode,
  additionalData: AdditionalDataType,
) => {
  const role = additionalData.roles.find((role) => role.id === node.roleId);

  const data = role
    ? {
        role,
        roleCitizensAlignment: node.roleCitizensAlignment,
        roleCitizensHideRole: node.roleCitizensHideRole,
        backgroundColor: node.backgroundColor,
        backgroundTransparency: node.backgroundTransparency,
        showUnlocked: node.showUnlocked,
        unlocked: isUnlocked(role, additionalData.assignedRoles),
      }
    : { redacted: true };

  return {
    id: node.id,
    type: FlowNodeType.ROLE_CITIZENS,
    position: {
      x: node.positionX,
      y: node.positionY,
    },
    data,
    width: node.width,
    height: node.height,
  };
};
