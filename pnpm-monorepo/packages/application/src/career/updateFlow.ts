import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { flowIdSchema, resolveFlowPermissionsOfActor } from "./flowContext.js";
import {
  MAXIMUM_FLOW_EDGES,
  MAXIMUM_FLOW_NODES,
  flowEdgeSchema,
  flowNodeSchema,
  toFlowNodeCreateData,
} from "./flowNodes.js";

export const updateFlowInputSchema = z.object({
  flow_id: flowIdSchema,
  nodes: z.array(flowNodeSchema).max(MAXIMUM_FLOW_NODES),
  edges: z.array(flowEdgeSchema).max(MAXIMUM_FLOW_EDGES),
});

export type UpdateFlowInput = z.infer<typeof updateFlowInputSchema>;

export interface UpdateFlowOutput {
  readonly flow_id: string;
  readonly node_count: number;
  readonly edge_count: number;
}

/**
 * The roles with the edit tier on the flow and the holders of `career;manage`
 * can save
 */
export const updateFlow = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateFlowInput,
): Promise<UpdateFlowOutput> =>
  withSpan(context, "updateFlow", async () => {
    /**
     * The only write path into the contents of an existing flow, thus it
     * checks the access per flow: the check of the edges below depends on
     * this boundary
     */
    const flow = await context.prisma.flow.findUnique({
      where: { id: input.flow_id },
      select: {
        id: true,
        deletedAt: true,
        roleAccess: { select: { roleId: true, type: true } },
      },
    });
    const permissions = flow && resolveFlowPermissionsOfActor(actor, flow);
    /**
     * A deleted flow grants nothing. A flow that the actor cannot read gets
     * the same answer as an unknown one, thus the answer does not show which
     * flows exist.
     */
    if (!flow || !permissions?.canRead)
      throw new NotFoundError(CareerErrorMessage.FlowNotFound);
    if (!permissions.canUpdate)
      throw new ForbiddenError("The actor can only read the career flow");

    /**
     * The edges are stored by node id only. Each endpoint must be one of the
     * nodes of the input, else an edge could connect to the nodes of a
     * different flow and cross the authorization boundary of the flow.
     */
    const nodeIds = new Set(input.nodes.map((node) => node.id));
    if (
      input.edges.some(
        (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
      )
    )
      throw new ValidationError(CareerErrorMessage.EdgeOutsideFlow);

    await context.prisma.$transaction([
      context.prisma.flowNode.deleteMany({ where: { flowId: flow.id } }),

      context.prisma.flowNode.createMany({
        data: input.nodes.map((node) => toFlowNodeCreateData(node, flow.id)),
      }),

      context.prisma.flowEdge.createMany({
        data: input.edges.map((edge) => ({
          id: edge.id,
          sourceId: edge.source,
          sourceHandle: edge.sourceHandle,
          targetId: edge.target,
          targetHandle: edge.targetHandle,
        })),
      }),

      /**
       * The nodes and the edges are in their own tables, thus the write
       * touches the flow row explicitly: the management list shows who
       * changed the diagram last, and when
       */
      context.prisma.flow.update({
        where: { id: flow.id },
        data: { updatedById: actor.citizen?.id ?? null },
      }),
    ]);

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOW_UPDATED,
        data: {
          flowId: flow.id,
          nodeCount: input.nodes.length,
          edgeCount: input.edges.length,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      flow_id: flow.id,
      node_count: input.nodes.length,
      edge_count: input.edges.length,
    };
  });
