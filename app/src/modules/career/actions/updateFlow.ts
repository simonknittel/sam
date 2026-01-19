"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
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

export const updateFlow = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("updateFlow");

    /**
     * Validate the request
     */
    const nodes = formData.get("nodes");
    const edges = formData.get("edges");
    if (!nodes || !edges) {
      log.warn("Bad Request", { error: "Missing nodes or edges" });
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }
    const result = schema.safeParse({
      flowId: formData.get("flowId"),
      nodes: JSON.parse(nodes as string) as unknown,
      edges: JSON.parse(edges as string) as unknown,
    });
    if (!result.success) {
      log.warn("Bad Request", { error: serializeError(result.error) });
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    /**
     * Authenticate and authorize the request
     */
    await authentication.authorizeAction("career", "update", [
      {
        key: "flowId",
        value: result.data.flowId,
      },
    ]);

    /**
     * Update flow
     */
    await prisma.$transaction([
      prisma.flowNode.deleteMany({
        where: {
          flowId: result.data.flowId,
        },
      }),

      prisma.flowNode.createMany({
        // @ts-expect-error
        data: result.data.nodes.map((node) => {
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
            result.data.flowId,
          );
        }),
      }),

      prisma.flowEdge.createMany({
        data: result.data.edges.map((edge) => ({
          id: edge.id,
          type: edge.type,
          sourceId: edge.source,
          sourceHandle: edge.sourceHandle,
          targetId: edge.target,
          targetHandle: edge.targetHandle,
        })),
      }),
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(`/app/career/${result.data.flowId}`);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
