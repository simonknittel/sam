"use client";

import { type FlowNode, FlowNodeType } from "@sam-monorepo/database/browser";
import { isUnlocked } from "../../shared/isUnlocked";
import type { AdditionalDataType } from "./additionalDataType";

export const getNodeType = (
  node: FlowNode,
  additionalData: AdditionalDataType,
) => {
  const role = additionalData.roles.find((role) => role.id === node.roleId);

  const data = role
    ? {
        role,
        roleImage: node.roleImage,
        backgroundColor: node.backgroundColor,
        backgroundTransparency: node.backgroundTransparency,
        showUnlocked: node.showUnlocked,
        unlocked: isUnlocked(role, additionalData.assignedRoles),
      }
    : { redacted: true };

  return {
    id: node.id,
    type: FlowNodeType.ROLE,
    position: {
      x: node.positionX,
      y: node.positionY,
    },
    data,
    width: node.width,
    height: node.height,
  };
};
