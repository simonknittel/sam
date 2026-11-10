import {
  FLEET_UPDATE_REMINDER_UNCHANGED_MONTHS,
  type OnSiteNotificationType,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";
import { findFleetUpdateReminderRecipient } from "../notifications/recipients/fleetUpdateReminder.js";
import { withSpan } from "../withSpan.js";

export interface SendDueFleetUpdateReminderInput {
  readonly citizenId: string;
}

/**
 * The last change of the citizen to their own ships. Each write of a ship
 * sets `updatedAt`, also the delete. The ships from before these columns
 * have only `createdAt`. The first login (`welcomedAt`) counts as a change,
 * thus the time of a citizen without ships starts with it. Null for a
 * citizen without ships and without a login.
 */
const findLastFleetChange = async (
  context: ApplicationContext,
  citizenId: string,
): Promise<Date | null> => {
  const [citizen, ships] = await Promise.all([
    context.prisma.citizen.findUnique({
      where: { id: citizenId },
      select: { welcomedAt: true },
    }),
    context.prisma.ship.aggregate({
      where: { ownerId: citizenId },
      _max: { createdAt: true, updatedAt: true },
    }),
  ]);

  const changes = [
    citizen?.welcomedAt,
    ships._max.createdAt,
    ships._max.updatedAt,
  ].filter((change) => change instanceof Date);
  if (changes.length <= 0) return null;

  return new Date(Math.max(...changes.map((change) => change.getTime())));
};

/**
 * Requests the fleet update reminder for the citizen when the citizen did not
 * change their own ships for `FLEET_UPDATE_REMINDER_UNCHANGED_MONTHS` or
 * more. The citizen gets one reminder for each such time: the next reminder
 * comes only after a new change and the same time again. The app calls it on
 * the first visit of the day of the citizen.
 */
export const sendDueFleetUpdateReminder = (
  context: ApplicationContext,
  input: SendDueFleetUpdateReminderInput,
): Promise<void> =>
  withSpan(context, "sendDueFleetUpdateReminder", async () => {
    const lastFleetChange = await findLastFleetChange(context, input.citizenId);
    if (!lastFleetChange) return;

    const unchangedSince = context.now();
    unchangedSince.setUTCMonth(
      unchangedSince.getUTCMonth() - FLEET_UPDATE_REMINDER_UNCHANGED_MONTHS,
    );
    if (lastFleetChange > unchangedSince) return;

    const reminderAfterLastChange =
      await context.prisma.onSiteNotification.findFirst({
        where: {
          citizenId: input.citizenId,
          notificationType:
            "fleet_update_reminder" satisfies OnSiteNotificationType,
          createdAt: { gte: lastFleetChange },
        },
        select: { id: true },
      });
    if (reminderAfterLastChange) return;

    // The router does this check too. Here it prevents a request on each day
    // for a citizen who cannot get the reminder: such a citizen never gets an
    // on-site notification that stops the requests.
    const recipient = await findFleetUpdateReminderRecipient(context, {
      citizenId: input.citizenId,
    });
    if (!recipient) return;

    await triggerNotificationsAfterSave(context, [
      { type: "FleetUpdateReminder", payload: { citizenId: input.citizenId } },
    ]);
  });
