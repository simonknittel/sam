import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { endPayoutOfCycles } from "./payoutEnd.js";
import { ProfitDistributionErrorMessage } from "./profitDistributionErrors.js";

export const endPayoutInputSchema = z.object({
  cycle_id: idSchema,
});

export type EndPayoutInput = z.infer<typeof endPayoutInputSchema>;

export interface EndPayoutOutput {
  readonly cycle_id: string;
}

export const endPayout = (
  context: ApplicationContext,
  actor: Actor,
  input: EndPayoutInput,
): Promise<EndPayoutOutput> =>
  withSpan(context, "endPayout", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "profitDistributionCycle", "update");

    const endedCycleIds = await endPayoutOfCycles(context, {
      where: { id: input.cycle_id },
      endedById: citizen.id,
      createdById: actor.userId,
    });
    if (endedCycleIds.length === 0)
      throw new ConflictError(ProfitDistributionErrorMessage.WrongPhase);

    return { cycle_id: input.cycle_id };
  });
