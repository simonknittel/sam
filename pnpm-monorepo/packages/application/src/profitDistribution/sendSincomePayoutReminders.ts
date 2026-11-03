import {
  addDaysToLocalDate,
  CYCLE_PHASE_WHERE,
  CyclePhase,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
  toDateColumnValue,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { isFirstRunAfterWallTime } from "../frequentAutomations.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { withSpan } from "../withSpan.js";

/**
 * The wall time ("HH:mm") of the reminders on the last day of the payout
 * phase, in the time zone of the organization
 */
const REMINDER_WALL_TIME = "07:30";

export interface SendSincomePayoutRemindersOutput {
  /** True only for the run of the day that sends the reminders */
  readonly isReminderRun: boolean;
  /** The cycles whose payout phase has its last day today */
  readonly cycleCount: number;
  readonly notificationsSent: boolean;
}

/**
 * Requests the `ProfitDistributionPayoutReminder` notification of each cycle
 * in the payout phase whose last day is today. The planned end of the payout
 * phase is this date (see `toDateColumnValue()`), and the midnight job ends
 * the phase after it (see `getPayoutPhaseEnd()`). Only the first run after
 * the reminder time sends them, the other runs of the day do nothing. The
 * notification router sends them to the participants who did not accept
 * their payout yet.
 */
export const sendSincomePayoutReminders = (
  context: ApplicationContext,
): Promise<SendSincomePayoutRemindersOutput> =>
  withSpan(context, "sendSincomePayoutReminders", async () => {
    const now = context.now();
    if (!isFirstRunAfterWallTime(now, REMINDER_WALL_TIME))
      return { isReminderRun: false, cycleCount: 0, notificationsSent: true };

    const today = getLocalDate(now, ORGANIZATION_TIMEZONE);
    const cycles = await context.prisma.profitDistributionCycle.findMany({
      where: {
        ...CYCLE_PHASE_WHERE[CyclePhase.Payout],
        payoutEndsAt: {
          gte: toDateColumnValue(today),
          lt: toDateColumnValue(addDaysToLocalDate(today, 1)),
        },
      },
      select: {
        id: true,
      },
    });

    const notificationsSent = await triggerNotificationsAfterSave(
      context,
      cycles.map((cycle) => ({
        type: "ProfitDistributionPayoutReminder",
        payload: { cycleId: cycle.id },
      })),
    );

    return {
      isReminderRun: true,
      cycleCount: cycles.length,
      notificationsSent,
    };
  });
