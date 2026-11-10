import { createId } from "@paralleldrive/cuid2";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowUniqueConstraintFailed } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { FLOW_OUTPUT_SELECT, createFlowInputSchema } from "./createFlow.js";
import { flowIdSchema } from "./flowContext.js";
import {
  FLOW_DIAGRAM_NODE_SELECT,
  type FlowDiagramNode,
} from "./flowDiagram.js";
import { requireUsableFlowSlug } from "./flowSlugs.js";

export const duplicateFlowInputSchema = z.object({
  source_flow_id: flowIdSchema,
  name: createFlowInputSchema.shape.name,
  slug: createFlowInputSchema.shape.slug,
});

export type DuplicateFlowInput = z.infer<typeof duplicateFlowInputSchema>;

export interface DuplicateFlowOutput {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly source_flow_id: string;
}

/**
 * Copies the nodes and the edges of a live flow into a new flow directly
 * after it. The copy gets no role access. Requires `career;manage`.
 *
 * @throws NotFoundError when the source flow does not exist or is deleted
 * @throws ValidationError when the copy cannot use the slug
 */
export const duplicateFlow = (
  context: ApplicationContext,
  actor: Actor,
  input: DuplicateFlowInput,
): Promise<DuplicateFlowOutput> =>
  withSpan(context, "duplicateFlow", async () => {
    requirePermission(actor, "career", "manage");

    /** A deleted flow is never a source */
    const source = await context.prisma.flow.findFirst({
      where: { id: input.source_flow_id, deletedAt: null },
      select: { id: true, position: true },
    });
    if (!source)
      throw new NotFoundError(CareerErrorMessage.DuplicateSourceNotFound);

    await requireUsableFlowSlug(context.prisma, input.slug);

    const sourceNodes = await context.prisma.flowNode.findMany({
      where: { flowId: source.id },
      select: FLOW_DIAGRAM_NODE_SELECT,
    });

    /**
     * The new node ids are cuid2 ids, because the save of the editor
     * examines the node ids and the edge endpoints with `idSchema`: a copy
     * with ids of a different shape could never be saved again.
     */
    const copiedNodes = sourceNodes.map((node) => ({
      sourceNode: node,
      id: createId(),
    }));
    const nodeIdMap = new Map(
      copiedNodes.map(({ sourceNode, id }) => [sourceNode.id, id]),
    );

    const sourceEdges = new Map<string, FlowDiagramNode["sources"][number]>();
    for (const node of sourceNodes) {
      for (const edge of [...node.sources, ...node.targets])
        sourceEdges.set(edge.id, edge);
    }

    /**
     * An edge that leaves its flow shows that the source data was already
     * inconsistent: the save of the editor refuses such an edge. To drop the
     * edge silently would hide the problem.
     */
    const edges = [...sourceEdges.values()].map((edge) => {
      const sourceId = nodeIdMap.get(edge.sourceId);
      const targetId = nodeIdMap.get(edge.targetId);
      if (!sourceId || !targetId)
        throw new Error(
          `Career flow ${source.id} has an edge leaving the flow (${edge.id})`,
        );

      return {
        id: createId(),
        sourceId,
        sourceHandle: edge.sourceHandle,
        targetId,
        targetHandle: edge.targetHandle,
      };
    });

    const citizenId = actor.citizen?.id ?? null;

    const flow = await rethrowUniqueConstraintFailed(
      () =>
        context.prisma.$transaction(async (transaction) => {
          /** Make room directly after the source */
          await transaction.flow.updateMany({
            where: { deletedAt: null, position: { gt: source.position } },
            data: { position: { increment: 1 } },
          });

          /**
           * Without role access on purpose: a copy that is not finished must
           * never get the audience of the source flow
           */
          const createdFlow = await transaction.flow.create({
            data: {
              name: input.name,
              slug: input.slug,
              position: source.position + 1,
              createdById: citizenId,
              updatedById: citizenId,
            },
            select: FLOW_OUTPUT_SELECT,
          });

          await transaction.flowNode.createMany({
            data: copiedNodes.map(({ sourceNode, id }) => ({
              id,
              flowId: createdFlow.id,
              positionX: sourceNode.positionX,
              positionY: sourceNode.positionY,
              width: sourceNode.width,
              height: sourceNode.height,
              type: sourceNode.type,
              roleId: sourceNode.roleId,
              roleImage: sourceNode.roleImage,
              markdown: sourceNode.markdown,
              markdownPosition: sourceNode.markdownPosition,
              roleCitizensAlignment: sourceNode.roleCitizensAlignment,
              roleCitizensHideRole: sourceNode.roleCitizensHideRole,
              showUnlocked: sourceNode.showUnlocked,
              backgroundColor: sourceNode.backgroundColor,
              backgroundTransparency: sourceNode.backgroundTransparency,
            })),
          });

          await transaction.flowEdge.createMany({ data: edges });

          return createdFlow;
        }),
      CareerErrorMessage.SlugTaken,
    );

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOW_DUPLICATED,
        data: {
          flowId: flow.id,
          name: input.name,
          slug: input.slug,
          sourceFlowId: source.id,
          nodeCount: sourceNodes.length,
          edgeCount: edges.length,
        },
        createdById: actor.userId,
      },
    ]);

    return { ...flow, source_flow_id: source.id };
  });
