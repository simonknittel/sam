import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  NotFoundError,
  rethrowRecordNotFound,
  rethrowUniqueConstraintFailed,
} from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import {
  FLOW_OUTPUT_SELECT,
  createFlowInputSchema,
  type FlowOutput,
} from "./createFlow.js";
import { flowIdSchema } from "./flowContext.js";
import { requireUsableFlowSlug } from "./flowSlugs.js";

export const renameFlowInputSchema = z.object({
  flow_id: flowIdSchema,
  name: createFlowInputSchema.shape.name,
  slug: createFlowInputSchema.shape.slug,
});

export type RenameFlowInput = z.infer<typeof renameFlowInputSchema>;

/** The links to the old slug stop to work */
export const renameFlow = (
  context: ApplicationContext,
  actor: Actor,
  input: RenameFlowInput,
): Promise<FlowOutput> =>
  withSpan(context, "renameFlow", async () => {
    requirePermission(actor, "career", "manage");

    const flow = await context.prisma.flow.findFirst({
      where: { id: input.flow_id, deletedAt: null },
      select: FLOW_OUTPUT_SELECT,
    });
    if (!flow) throw new NotFoundError(CareerErrorMessage.FlowNotFound);

    await requireUsableFlowSlug(context.prisma, input.slug, {
      exceptFlowId: flow.id,
    });

    /**
     * The condition on `deletedAt` keeps a different request from deleting
     * the flow between the check and the write unnoticed
     */
    const renamedFlow = await rethrowRecordNotFound(
      () =>
        rethrowUniqueConstraintFailed(
          () =>
            context.prisma.flow.update({
              where: { id: flow.id, deletedAt: null },
              data: {
                name: input.name,
                slug: input.slug,
                updatedById: actor.citizen?.id ?? null,
              },
              select: FLOW_OUTPUT_SELECT,
            }),
          CareerErrorMessage.SlugTaken,
        ),
      CareerErrorMessage.FlowNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOW_RENAMED,
        data: {
          flowId: flow.id,
          previousName: flow.name,
          name: input.name,
          previousSlug: flow.slug,
          slug: input.slug,
        },
        createdById: actor.userId,
      },
    ]);

    return renamedFlow;
  });
