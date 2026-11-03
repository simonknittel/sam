import {
  AuditEventType,
  CYCLE_PHASE_WHERE,
  CyclePhase,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { ProfitDistributionErrorMessage } from "./profitDistributionErrors.js";

export const startPayoutInputSchema = z.object({
  cycle_id: idSchema,
  auec_profit: z.number().min(0),
  payout_ends_at: z.coerce
    .date()
    .nullable()
    .describe(
      "The planned end of the payout phase, a date. Without it, the payout continues until a manager ends it.",
    ),
});

export type StartPayoutInput = z.infer<typeof startPayoutInputSchema>;

export interface StartPayoutOutput {
  readonly cycle_id: string;
}

/**
 * Starts the payout phase of a cycle with the aUEC profit to distribute, and
 * notifies the participants. Requires a citizen and
 * `profitDistributionCycle;update`.
 *
 * @throws ConflictError when the cycle does not exist or is not in its
 * payout preparation phase
 */
export const startPayout = (
  context: ApplicationContext,
  actor: Actor,
  input: StartPayoutInput,
): Promise<StartPayoutOutput> =>
  withSpan(context, "startPayout", async () => {
    const citizen = requireCitizen(actor);
    requirePermission(actor, "profitDistributionCycle", "update");

    /** The guarded update is the check of the phase and the claim */
    const { count } = await context.prisma.profitDistributionCycle.updateMany({
      where: {
        id: input.cycle_id,
        ...CYCLE_PHASE_WHERE[CyclePhase.PayoutPreparation],
      },
      data: {
        payoutStartedAt: context.now(),
        payoutStartedById: citizen.id,
        auecProfit: input.auec_profit,
        payoutEndsAt: input.payout_ends_at,
      },
    });
    if (count === 0)
      throw new ConflictError(ProfitDistributionErrorMessage.WrongPhase);

    await context.audit.create([
      {
        type: AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED,
        data: { cycleId: input.cycle_id },
        createdById: actor.userId,
      },
    ]);

    await triggerNotificationsAfterSave(context, [
      {
        type: "ProfitDistributionPayoutStarted",
        payload: { cycleId: input.cycle_id },
      },
    ]);

    return { cycle_id: input.cycle_id };
  });
