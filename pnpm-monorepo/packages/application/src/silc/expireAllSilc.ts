import {
  AuditEventType,
  BalancesToBook,
  bookBalancesToZero,
} from "@sam-monorepo/domain";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/** The description of the bookings that remove the balances */
const EXPIRED_BOOKING_DESCRIPTION = "Verfallen";

export interface ExpireAllSilcOutput {
  /** The citizens that had a positive balance */
  readonly citizen_count: number;
  /** The sum of the removed balances, as a positive number */
  readonly expired_value: number;
}

/**
 * Books the positive SILC balance of each citizen that is not deleted away.
 * Requires `silcBalanceOfOtherCitizen;manage` and a citizen, who becomes the
 * creator of the bookings. It sends no notifications.
 */
export const expireAllSilc = (
  context: ApplicationContext,
  actor: Actor,
): Promise<ExpireAllSilcOutput> =>
  withSpan(context, "expireAllSilc", async () => {
    requirePermission(actor, "silcBalanceOfOtherCitizen", "manage");
    const citizen = requireCitizen(actor);

    const { balances } = await context.prisma.$transaction((transaction) =>
      bookBalancesToZero(transaction, {
        balances: BalancesToBook.Positive,
        description: EXPIRED_BOOKING_DESCRIPTION,
        createdById: citizen.id,
      }),
    );
    const output: ExpireAllSilcOutput = {
      citizen_count: balances.length,
      expired_value: balances.reduce((sum, balance) => sum + balance.value, 0),
    };

    await context.audit.create([
      {
        type: AuditEventType.SILC_ALL_EXPIRED,
        data: {
          citizenCount: output.citizen_count,
          expiredValue: output.expired_value,
        },
        createdById: actor.userId,
      },
    ]);

    return output;
  });
