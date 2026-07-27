"use client";

import { type FlowNode, FlowNodeType } from "@/generated/prisma/browser";

export const getNodeType = (node: FlowNode) => {
  const data = {
    markdown: node.markdown,
    markdownPosition: node.markdownPosition,
    backgroundColor: node.backgroundColor,
    backgroundTransparency: node.backgroundTransparency,
  };

  return {
    id: node.id,
    type: FlowNodeType.MARKDOWN,
    position: {
      x: node.positionX,
      y: node.positionY,
    },
    data,
    width: node.width,
    height: node.height,
  };
};
