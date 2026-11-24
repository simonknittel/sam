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
  readonly isReminderRun: boolean;
  readonly cycleCount: number;
  readonly notificationsSent: boolean;
}

/**
 * The planned end of the payout phase is the last day (see
 * `toDateColumnValue()`), and the midnight job ends the phase after it (see
 * `getPayoutPhaseEnd()`)
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
