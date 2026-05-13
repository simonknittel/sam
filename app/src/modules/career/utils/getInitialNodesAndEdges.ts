import {
  type Flow,
  type FlowEdge,
  type FlowNode,
} from "@/generated/prisma/browser";
import { nodeDefinitions } from "../nodes/client";

export const getInitialNodesAndEdges = (
  flow: Flow & {
    nodes: (FlowNode & {
      sources: FlowEdge[];
      targets: FlowEdge[];
    })[];
  },
  additionalData: Record<string, unknown>,
) => {
  const initialNodes = flow.nodes.map((node) => {
    const matchingNodeDefinition = nodeDefinitions.find(
      (nodeDefinition) => nodeDefinition.enum === node.type,
    );

    if (!matchingNodeDefinition) throw new Error("Invalid node type");

    // @ts-expect-error
    return matchingNodeDefinition.getNodeType(node, additionalData);
  });

  const uniqueEdges = new Map<FlowEdge["id"], FlowEdge>();
  for (const node of flow.nodes) {
    for (const source of node.sources) {
      uniqueEdges.set(source.id, source);
    }

    for (const target of node.targets) {
      uniqueEdges.set(target.id, target);
    }
  }
  const initialEdges = Array.from(uniqueEdges.values()).map((edge) => {
    const { sourceId, targetId, ...rest } = edge;

    return {
      source: sourceId,
      target: targetId,
      ...rest,
    };
  });

  return { initialNodes, initialEdges };
};
