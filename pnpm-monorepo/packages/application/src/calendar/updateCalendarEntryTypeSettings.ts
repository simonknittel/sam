import {
  AuditEventType,
  CALENDAR_ENTRY_TYPES,
  CalendarEntryType,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { findOptOutChanges } from "../optOutChanges.js";
import { withSpan } from "../withSpan.js";
import { findOwnCalendarEntryTypeSettings } from "./findOwnCalendarEntryTypeSettings.js";

export const updateCalendarEntryTypeSettingsInputSchema = z.object({
  enabled_types: z
    .array(z.enum(CalendarEntryType))
    // The form sends each switched-on type one time
    .max(CALENDAR_ENTRY_TYPES.length)
    .describe(
      "The entry types that the calendar shows. All other types that the user can read are switched off.",
    ),
});

export type UpdateCalendarEntryTypeSettingsInput = z.output<
  typeof updateCalendarEntryTypeSettingsInputSchema
>;

export interface UpdateCalendarEntryTypeSettingsOutput {
  /** The types that the calendar shows again */
  readonly enabled: CalendarEntryType[];
  /** The types that the citizen switched off */
  readonly disabled: CalendarEntryType[];
}

/**
 * Sets which entry types the calendar and its dashboard tile show for the
 * actor. A checked type is in the input, a cleared type is absent. Only the
 * types that the actor can read change: the filter does not offer the other
 * types, thus their rows stay. Only the types that the request really
 * changes are written and logged.
 *
 * @throws ForbiddenError for a user without a citizen
 */
export const updateCalendarEntryTypeSettings = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateCalendarEntryTypeSettingsInput,
): Promise<UpdateCalendarEntryTypeSettingsOutput> =>
  withSpan(context, "updateCalendarEntryTypeSettings", async () => {
    const citizenId = requireCitizen(actor).id;

    const settings = await findOwnCalendarEntryTypeSettings(context, actor);

    const { enabled, disabled } = findOptOutChanges<CalendarEntryType>(
      settings.map((setting) => setting.type),
      new Set(input.enabled_types),
      new Set(
        settings
          .filter((setting) => !setting.enabled)
          .map((setting) => setting.type),
      ),
    );

    if (enabled.length > 0 || disabled.length > 0) {
      const disabledAt = context.now();

      await context.prisma.$transaction([
        ...enabled.map((entryType) =>
          // deleteMany instead of delete: two overlapping saves must not
          // throw when the row is already gone
          context.prisma.calendarEntryTypeSetting.deleteMany({
            where: { citizenId, entryType },
          }),
        ),
        ...disabled.map((entryType) =>
          context.prisma.calendarEntryTypeSetting.upsert({
            where: { citizenId_entryType: { citizenId, entryType } },
            update: { disabledAt },
            create: { citizenId, entryType, disabledAt },
          }),
        ),
      ]);

      await context.audit.create([
        {
          type: AuditEventType.CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED,
          data: { citizenId, enabled, disabled },
          createdById: actor.userId,
        },
      ]);
    }

    return { enabled, disabled };
  });
