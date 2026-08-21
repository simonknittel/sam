"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nodeDefinitions } from "../nodes/server";
import { getFlowContext } from "../queries/getFlowContext";

const nodesSchema = z
  .array(
    z.discriminatedUnion(
      "type",
      // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
      nodeDefinitions.map((nodeDefinition) => nodeDefinition.updateFlowSchema),
    ),
  )
  .max(250); // Arbitrary (untested) limit to prevent DDoS

const edgesSchema = z
  .array(
    z.object({
      id: z.string(),
      type: z.string(),
      source: z.cuid2(),
      sourceHandle: z.string(),
      target: z.cuid2(),
      targetHandle: z.string(),
    }),
  )
  .max(250); // Arbitrary (untested) limit to prevent DDoS

const schema = z.object({
  flowId: z.string(),
  nodes: nodesSchema,
  edges: edgesSchema,
});

export const updateFlow = createAuthenticatedAction(
  "updateFlow",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * The only write path into a flow's contents, so it keeps authorizing per
     * flow — the edge-crossing check below depends on that boundary.
     */
    const context = await getFlowContext();
    const flow = context?.flowsById.get(data.flowId);
    if (!flow || !context?.permissions.get(flow.id)?.canUpdate)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Edges are stored by node id only. Every endpoint must be one of the
     * nodes being written for this flow, otherwise an edge could attach to
     * another flow's nodes and cross the per-flow authorization boundary.
     */
    const nodeIds = new Set<string>(
      // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
      data.nodes.map((node) => node.id), // eslint-disable-line @typescript-eslint/no-unsafe-return -- same reason as the @ts-expect-error above
    );
    if (
      data.edges.some(
        (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
      )
    )
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    /**
     * Update flow
     */
    await prisma.$transaction([
      prisma.flowNode.deleteMany({
        where: {
          flowId: data.flowId,
        },
      }),

      prisma.flowNode.createMany({
        // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
        data: data.nodes.map((node) => {
          const matchingNodeDefnition = nodeDefinitions.find(
            // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
            (nodeDefinition) => nodeDefinition.enum === node.type,
          );

          if (!matchingNodeDefnition) {
            log.warn("Bad Request", { error: "Unknown node type", node });
            return;
          }

          return matchingNodeDefnition.createManyMapping(
            // @ts-expect-error The career node definitions are too heterogeneous for TypeScript to unify
            node,
            data.flowId,
          );
        }),
      }),

      prisma.flowEdge.createMany({
        data: data.edges.map((edge) => ({
          id: edge.id,
          type: edge.type,
          sourceId: edge.source,
          sourceHandle: edge.sourceHandle,
          targetId: edge.target,
          targetHandle: edge.targetHandle,
        })),
      }),

      /**
       * Nodes and edges live in their own tables, so the flow row has to be
       * touched explicitly for the management list to show who last changed
       * the diagram and when.
       */
      prisma.flow.update({
        where: { id: data.flowId },
        data: { updatedById: authentication.session.entity?.id ?? null },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_UPDATED,
        data: {
          flowId: data.flowId,
          nodeCount: data.nodes.length,
          edgeCount: data.edges.length,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/career/${flow.slug}`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      flowId: formData.get("flowId"),
      nodes: JSON.parse((formData.get("nodes") as string) || "null") as unknown,
      edges: JSON.parse((formData.get("edges") as string) || "null") as unknown,
    }),
  },
);
