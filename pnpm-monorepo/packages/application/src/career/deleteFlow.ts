import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, rethrowRecordNotFound } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { FLOW_OUTPUT_SELECT, type FlowOutput } from "./createFlow.js";
import { flowIdSchema } from "./flowContext.js";

export const deleteFlowInputSchema = z.object({
  flow_id: flowIdSchema,
});

export type DeleteFlowInput = z.infer<typeof deleteFlowInputSchema>;

/** The flow releases its slug */
export const deleteFlow = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteFlowInput,
): Promise<FlowOutput> =>
  withSpan(context, "deleteFlow", async () => {
    requirePermission(actor, "career", "manage");

    const flow = await context.prisma.flow.findFirst({
      where: { id: input.flow_id, deletedAt: null },
      select: FLOW_OUTPUT_SELECT,
    });
    if (!flow) throw new NotFoundError(CareerErrorMessage.FlowNotFound);

    const citizenId = actor.citizen?.id ?? null;

    /**
     * Soft delete only: the nodes, the edges and the role access stay in
     * place, thus a restore is possible. The condition on `deletedAt` lets
     * only one of two parallel requests delete the flow.
     */
    await rethrowRecordNotFound(
      () =>
        context.prisma.flow.update({
          where: { id: flow.id, deletedAt: null },
          data: {
            deletedAt: context.now(),
            deletedById: citizenId,
            updatedById: citizenId,
          },
          select: { id: true },
        }),
      CareerErrorMessage.FlowNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOW_DELETED,
        data: { flowId: flow.id, name: flow.name, slug: flow.slug },
        createdById: actor.userId,
      },
    ]);

    return flow;
  });
