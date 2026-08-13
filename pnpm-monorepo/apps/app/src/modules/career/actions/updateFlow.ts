"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nodeDefinitions } from "../nodes/server";

const nodesSchema = z
  .array(
    z.discriminatedUnion(
      "type",
      // @ts-expect-error
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
    if (
      !(await authentication.authorize("career", "update", [
        {
          key: "flowId",
          value: data.flowId,
        },
      ]))
    )
      return {
        error: t("Common.forbidden"),
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
        // @ts-expect-error
        data: data.nodes.map((node) => {
          const matchingNodeDefnition = nodeDefinitions.find(
            // @ts-expect-error
            (nodeDefinition) => nodeDefinition.enum === node.type,
          );

          if (!matchingNodeDefnition) {
            log.warn("Bad Request", { error: "Unknown node type", node });
            return;
          }

          return matchingNodeDefnition.createManyMapping(
            // @ts-expect-error
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
    revalidatePath(`/app/career/${data.flowId}`);

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
