import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { announceSilcTransactions } from "../silc/silcLedger.js";
import { withSpan } from "../withSpan.js";
import { endCollectionPhaseOfCycle } from "./collectionEnd.js";
import { ProfitDistributionErrorMessage } from "./profitDistributionErrors.js";

export const endCollectionPhaseInputSchema = z.object({
  cycle_id: idSchema,
});

export type EndCollectionPhaseInput = z.infer<
  typeof endCollectionPhaseInputSchema
>;

export interface EndCollectionPhaseOutput {
  readonly cycle_id: string;
  readonly booking_count: number;
}

export const endCollectionPhase = (
  context: ApplicationContext,
  actor: Actor,
  input: EndCollectionPhaseInput,
): Promise<EndCollectionPhaseOutput> =>
  withSpan(context, "endCollectionPhase", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "profitDistributionCycle", "update");

    const transactionIds = await endCollectionPhaseOfCycle(context, {
      cycleId: input.cycle_id,
      endedById: citizen.id,
      createdById: actor.userId,
    });
    if (transactionIds === null)
      throw new ConflictError(ProfitDistributionErrorMessage.WrongPhase);

    await announceSilcTransactions(context, transactionIds);

    return {
      cycle_id: input.cycle_id,
      booking_count: transactionIds.length,
    };
  });
