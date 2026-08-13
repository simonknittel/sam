import { type FlowNodeType } from "@sam-monorepo/database/client";
import type { NodeProps } from "@xyflow/react";
import type { ComponentType } from "react";
import { nodeDefinitions } from "../nodes/client";

export const nodeTypes: Record<
  FlowNodeType,
  ComponentType<NodeProps>
> = nodeDefinitions.reduce(
  (acc, nodeDefinition) => {
    // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
    acc[nodeDefinition.enum] = nodeDefinition.Node;
    return acc;
  },
  {} as Record<FlowNodeType, ComponentType<NodeProps>>,
);
