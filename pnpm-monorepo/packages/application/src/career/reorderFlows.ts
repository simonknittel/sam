import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { flowIdSchema } from "./flowContext.js";

/** The limit against a crafted payload. The list has far fewer flows. */
const MAXIMUM_REORDERED_FLOWS = 250;

export const reorderFlowsInputSchema = z.object({
  /** All live flows in the new order */
  flow_ids: z.array(flowIdSchema).min(1).max(MAXIMUM_REORDERED_FLOWS),
});

export type ReorderFlowsInput = z.infer<typeof reorderFlowsInputSchema>;

export interface ReorderFlowsOutput {
  readonly flow_ids: readonly string[];
}

export const reorderFlows = (
  context: ApplicationContext,
  actor: Actor,
  input: ReorderFlowsInput,
): Promise<ReorderFlowsOutput> =>
  withSpan(context, "reorderFlows", async () => {
    requirePermission(actor, "career", "manage");

    const flows = await context.prisma.flow.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    /**
     * The input must be a permutation of exactly the live flows. All other
     * lists (a stale list after a parallel create or delete, a duplicate id)
     * would apply the order only partially.
     */
    const givenIds = new Set(input.flow_ids);
    const isPermutation =
      givenIds.size === input.flow_ids.length &&
      givenIds.size === flows.length &&
      flows.every((flow) => givenIds.has(flow.id));
    if (!isPermutation) throw new ConflictError(CareerErrorMessage.StaleOrder);

    /**
     * The positions are not unique, thus one transaction can give the whole
     * list new numbers without placeholder values
     */
    await context.prisma.$transaction(
      input.flow_ids.map((flowId, index) =>
        context.prisma.flow.update({
          where: { id: flowId },
          data: { position: index },
        }),
      ),
    );

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOWS_REORDERED,
        data: { flowIds: input.flow_ids },
        createdById: actor.userId,
      },
    ]);

    return { flow_ids: input.flow_ids };
  });
