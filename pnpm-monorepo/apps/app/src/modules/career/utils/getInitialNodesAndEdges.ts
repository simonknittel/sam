import type { FlowDiagram, FlowDiagramNode } from "@sam-monorepo/application";
import { nodeDefinitions } from "../nodes/client";

type FlowDiagramEdge = FlowDiagramNode["sources"][number];

export const getInitialNodesAndEdges = (
  flow: FlowDiagram,
  additionalData: Record<string, unknown>,
) => {
  const initialNodes = flow.nodes.map((node) => {
    const matchingNodeDefinition = nodeDefinitions.find(
      (nodeDefinition) => nodeDefinition.enum === node.type,
    );

    if (!matchingNodeDefinition) throw new Error("Invalid node type");

    // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
    return matchingNodeDefinition.getNodeType(node, additionalData);
  });

  const uniqueEdges = new Map<FlowDiagramEdge["id"], FlowDiagramEdge>();
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
