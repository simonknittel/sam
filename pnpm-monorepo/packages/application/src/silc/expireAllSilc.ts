import { AuditEventType, bookBalancesToZero } from "@sam-monorepo/domain";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

const EXPIRED_BOOKING_DESCRIPTION = "Verfallen";

export interface ExpireAllSilcOutput {
  /** The citizens that had a positive balance */
  readonly citizen_count: number;
  readonly expired_value: number;
  readonly reset_citizen_count: number;
  /** The sum of the negative balances that were booked to 0, as a positive number */
  readonly reset_value: number;
}

/** It sends no notifications */
export const expireAllSilc = (
  context: ApplicationContext,
  actor: Actor,
): Promise<ExpireAllSilcOutput> =>
  withSpan(context, "expireAllSilc", async () => {
    requirePermission(actor, "silcBalanceOfOtherCitizen", "manage");
    const citizen = requireCitizen(actor);

    const { balances } = await context.prisma.$transaction((transaction) =>
      bookBalancesToZero(transaction, {
        description: EXPIRED_BOOKING_DESCRIPTION,
        createdById: citizen.id,
      }),
    );
    const positiveBalances = balances.filter(({ value }) => value > 0);
    const negativeBalances = balances.filter(({ value }) => value < 0);
    const output: ExpireAllSilcOutput = {
      citizen_count: positiveBalances.length,
      expired_value: positiveBalances.reduce(
        (sum, balance) => sum + balance.value,
        0,
      ),
      reset_citizen_count: negativeBalances.length,
      reset_value: negativeBalances.reduce(
        (sum, balance) => sum - balance.value,
        0,
      ),
    };

    await context.audit.create([
      {
        type: AuditEventType.SILC_ALL_EXPIRED_V2,
        data: {
          expiredCitizenCount: output.citizen_count,
          expiredValue: output.expired_value,
          resetCitizenCount: output.reset_citizen_count,
          resetValue: output.reset_value,
        },
        createdById: actor.userId,
      },
    ]);

    return output;
  });
