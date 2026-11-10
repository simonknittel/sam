"use client";

import type { FlowDiagramNode } from "@sam-monorepo/application";
import { FlowNodeType } from "@sam-monorepo/database/browser";

export const getNodeType = (node: FlowDiagramNode) => {
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
