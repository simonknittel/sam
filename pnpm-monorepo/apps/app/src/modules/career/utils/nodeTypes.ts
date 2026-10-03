import { type FlowNodeType } from "@sam-monorepo/database/client";
import type { NodeProps } from "@xyflow/react";
import type { ComponentType } from "react";
import { nodeDefinitions } from "../nodes/client";

/**
 * The career node definitions are too heterogeneous for TypeScript to unify,
 * thus the type comes from an assertion.
 */
export const nodeTypes = Object.fromEntries(
  nodeDefinitions.map((nodeDefinition) => [
    nodeDefinition.enum,
    nodeDefinition.Node,
  ]),
) as Record<FlowNodeType, ComponentType<NodeProps>>;
