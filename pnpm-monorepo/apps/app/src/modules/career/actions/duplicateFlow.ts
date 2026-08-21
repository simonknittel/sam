"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { SLUG_MAX_LENGTH } from "@/modules/common/utils/slugify";
import { createId } from "@paralleldrive/cuid2";
import { Prisma, type FlowEdge } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getFlowContext } from "../queries/getFlowContext";
import {
  FLOW_NAME_MAX_LENGTH,
  FLOW_SLUG_TAKEN_ERROR,
  validateFlowSlug,
} from "../utils/flowSlug";

const schema = z.object({
  sourceFlowId: z.string(),
  name: z.string().trim().min(1).max(FLOW_NAME_MAX_LENGTH),
  slug: z.string().trim().min(1).max(SLUG_MAX_LENGTH),
});

export const duplicateFlow = createAuthenticatedAction(
  "duplicateFlow",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("career", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Through the context like every other career read, so a soft-deleted
     * flow is never a valid source.
     */
    const context = await getFlowContext();
    const sourceMetadata = context?.flows.find(
      (flow) => flow.id === data.sourceFlowId,
    );
    if (!sourceMetadata)
      return {
        error: "Der zu duplizierende Karrierebaum wurde nicht gefunden.",
        requestPayload: formData,
      };

    const slugError = validateFlowSlug(data.slug);
    if (slugError) return { error: slugError, requestPayload: formData };

    const takenSlug = await prisma.flow.findFirst({
      where: { slug: data.slug, deletedAt: null },
      select: { id: true },
    });
    if (takenSlug)
      return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };

    const sourceNodes = await prisma.flowNode.findMany({
      where: { flowId: sourceMetadata.id },
      include: { sources: true, targets: true },
    });

    /**
     * Node ids are cuid2 because the update action validates edge endpoints
     * as such — a copy with differently shaped ids could never be saved
     * again.
     */
    const nodeIdMap = new Map(
      sourceNodes.map((node) => [node.id, createId()] as const),
    );

    const sourceEdges = new Map<string, FlowEdge>();
    for (const node of sourceNodes) {
      for (const edge of [...node.sources, ...node.targets])
        sourceEdges.set(edge.id, edge);
    }

    /**
     * An edge pointing outside its own flow means the source data was
     * already inconsistent — the same invariant the update action enforces
     * on incoming payloads. Dropping such an edge silently would hide it.
     */
    const edges = [...sourceEdges.values()].map((edge) => {
      const sourceId = nodeIdMap.get(edge.sourceId);
      const targetId = nodeIdMap.get(edge.targetId);
      if (!sourceId || !targetId)
        throw new Error(
          `Career flow ${sourceMetadata.id} has an edge leaving the flow (${edge.id})`,
        );

      return {
        id: createId(),
        type: edge.type,
        sourceId,
        sourceHandle: edge.sourceHandle,
        targetId,
        targetHandle: edge.targetHandle,
      };
    });

    const citizenId = authentication.session.entity?.id ?? null;

    let flowId: string;
    try {
      flowId = await prisma.$transaction(async (transaction) => {
        /** Make room directly after the source */
        await transaction.flow.updateMany({
          where: {
            deletedAt: null,
            position: { gt: sourceMetadata.position },
          },
          data: { position: { increment: 1 } },
        });

        /**
         * Deliberately without any roleAccess rows: a half-finished variant
         * must never inherit the source flow's audience.
         */
        const flow = await transaction.flow.create({
          data: {
            name: data.name,
            slug: data.slug,
            position: sourceMetadata.position + 1,
            createdById: citizenId,
            updatedById: citizenId,
          },
          select: { id: true },
        });

        await transaction.flowNode.createMany({
          data: sourceNodes.map((node) => ({
            id: nodeIdMap.get(node.id)!,
            flowId: flow.id,
            positionX: node.positionX,
            positionY: node.positionY,
            width: node.width,
            height: node.height,
            type: node.type,
            roleId: node.roleId,
            roleImage: node.roleImage,
            markdown: node.markdown,
            markdownPosition: node.markdownPosition,
            roleCitizensAlignment: node.roleCitizensAlignment,
            roleCitizensHideRole: node.roleCitizensHideRole,
            showUnlocked: node.showUnlocked,
            backgroundColor: node.backgroundColor,
            backgroundTransparency: node.backgroundTransparency,
          })),
        });

        await transaction.flowEdge.createMany({ data: edges });

        return flow.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return { error: FLOW_SLUG_TAKEN_ERROR, requestPayload: formData };
      throw error;
    }

    await createAuditEvents([
      {
        type: AuditEventType.CAREER_FLOW_DUPLICATED,
        data: {
          flowId,
          name: data.name,
          slug: data.slug,
          sourceFlowId: sourceMetadata.id,
          nodeCount: sourceNodes.length,
          edgeCount: edges.length,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/career", "layout");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
