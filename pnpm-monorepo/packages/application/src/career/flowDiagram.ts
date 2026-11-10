import type { Prisma } from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { resolveFlowPermissionsOfActor } from "./flowContext.js";

/** The diagram gives each column of an edge to React Flow */
const FLOW_DIAGRAM_EDGE_SELECT = {
  id: true,
  sourceId: true,
  sourceHandle: true,
  targetId: true,
  targetHandle: true,
} as const satisfies Prisma.FlowEdgeSelect;

export const FLOW_DIAGRAM_NODE_SELECT = {
  id: true,
  type: true,
  positionX: true,
  positionY: true,
  width: true,
  height: true,
  roleId: true,
  roleImage: true,
  roleCitizensAlignment: true,
  roleCitizensHideRole: true,
  showUnlocked: true,
  markdown: true,
  markdownPosition: true,
  backgroundColor: true,
  backgroundTransparency: true,
  sources: { select: FLOW_DIAGRAM_EDGE_SELECT },
  targets: { select: FLOW_DIAGRAM_EDGE_SELECT },
} as const satisfies Prisma.FlowNodeSelect;

/** A node of the diagram with its outgoing (`sources`) and incoming edges */
export type FlowDiagramNode = Prisma.FlowNodeGetPayload<{
  select: typeof FLOW_DIAGRAM_NODE_SELECT;
}>;

export interface FlowDiagram {
  readonly id: string;
  readonly nodes: FlowDiagramNode[];
}

/**
 * The diagram of one flow, or null when the flow does not exist, is deleted
 * or the actor cannot read it. The flow context, which each career page
 * loads, does not hold the diagrams: only the page that shows a flow needs
 * its nodes and edges.
 */
export const findReadableFlowDiagram = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { flowId }: { readonly flowId: string },
): Promise<FlowDiagram | null> => {
  const flow = await context.prisma.flow.findUnique({
    where: { id: flowId },
    select: {
      id: true,
      deletedAt: true,
      roleAccess: { select: { roleId: true, type: true } },
      nodes: { select: FLOW_DIAGRAM_NODE_SELECT },
    },
  });
  if (!flow) return null;

  /** A deleted flow grants nothing, thus it is not readable */
  if (!resolveFlowPermissionsOfActor(actor, flow)?.canRead) return null;

  return { id: flow.id, nodes: flow.nodes };
};
