import { CYCLE_PHASE_WHERE, CyclePhase } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

/** The time between the reminder and the planned end of the payout phase */
const REMINDER_HOURS_BEFORE_PAYOUT_END = 24;

/**
 * The interval of the schedule of `frequent-automations`: thus the planned
 * end of each cycle is in the window of exactly one run.
 */
const RUN_INTERVAL_MINUTES = 15;

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;

export interface SendSincomePayoutRemindersOutput {
  /** The cycles whose payout phase ends in 24 hours */
  readonly cycleCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `ProfitDistributionPayoutReminder` notification of each cycle
 * in the payout phase whose planned end is 24 hours (plus less than one run
 * interval) after now. The notification router sends it to the participants
 * who did not accept their payout yet.
 */
export const sendSincomePayoutReminders = (
  context: ApplicationContext,
): Promise<SendSincomePayoutRemindersOutput> =>
  withSpan(context, "sendSincomePayoutReminders", async () => {
    const windowStart = new Date(
      context.now().getTime() +
        REMINDER_HOURS_BEFORE_PAYOUT_END * MILLISECONDS_PER_HOUR,
    );
    const cycles = await context.prisma.profitDistributionCycle.findMany({
      where: {
        ...CYCLE_PHASE_WHERE[CyclePhase.Payout],
        payoutEndsAt: {
          gte: windowStart,
          lt: new Date(
            windowStart.getTime() +
              RUN_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE,
          ),
        },
      },
      select: {
        id: true,
      },
    });
    if (cycles.length <= 0) return { cycleCount: 0, notificationsSent: true };

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      cycles.map((cycle) => ({
        type: "ProfitDistributionPayoutReminder",
        payload: { cycleId: cycle.id },
      })),
    );

    return { cycleCount: cycles.length, notificationsSent };
  });
