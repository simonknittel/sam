import {
  AuditEventType,
  BIRTHDAY_DAY_MAX,
  BIRTHDAY_DAY_MIN,
  BIRTHDAY_MONTH_MAX,
  BIRTHDAY_MONTH_MIN,
  getMaximumDayOfMonth,
  isSupportedTimezone,
  TIMEZONE_MAX_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CitizenErrorMessage } from "./citizenErrors.js";

export const updateOwnProfileInputSchema = z.object({
  /** Null removes the time zone */
  timezone: z
    .string()
    .max(TIMEZONE_MAX_LENGTH)
    .refine(isSupportedTimezone)
    .nullable(),
  /** Null together with `birthday_month` to remove the birthday */
  birthday_day: z.int().min(BIRTHDAY_DAY_MIN).max(BIRTHDAY_DAY_MAX).nullable(),
  birthday_month: z
    .int()
    .min(BIRTHDAY_MONTH_MIN)
    .max(BIRTHDAY_MONTH_MAX)
    .nullable(),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileInputSchema>;

export interface UpdateOwnProfileOutput {
  readonly timezone: string | null;
  readonly birthday_day: number | null;
  readonly birthday_month: number | null;
}

export const updateOwnProfile = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateOwnProfileInput,
): Promise<UpdateOwnProfileOutput> =>
  withSpan(context, "updateOwnProfile", async () => {
    const citizen = requireCitizen(actor);
    const {
      timezone,
      birthday_day: birthdayDay,
      birthday_month: birthdayMonth,
    } = input;

    if ((birthdayDay === null) !== (birthdayMonth === null))
      throw new ValidationError(CitizenErrorMessage.BirthdayIncomplete);

    if (
      birthdayDay !== null &&
      birthdayMonth !== null &&
      birthdayDay > getMaximumDayOfMonth(birthdayMonth)
    )
      throw new ValidationError(CitizenErrorMessage.BirthdayDayNotInMonth);

    const currentCitizen = await context.prisma.citizen.findUniqueOrThrow({
      where: { id: citizen.id },
      select: { birthdayDay: true, birthdayMonth: true },
    });

    /**
     * A new birthday later in the same year must still be greeted, thus the
     * marker of the last greeting goes whenever the date changes
     */
    const isBirthdayChanged =
      currentCitizen.birthdayDay !== birthdayDay ||
      currentCitizen.birthdayMonth !== birthdayMonth;

    await context.prisma.citizen.update({
      where: { id: citizen.id },
      data: {
        timezone,
        birthdayDay,
        birthdayMonth,
        ...(isBirthdayChanged ? { birthdayGreetingSentAt: null } : {}),
      },
      select: { id: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.CITIZEN_PROFILE_UPDATED,
        data: {
          citizenId: citizen.id,
          timezoneSet: timezone !== null,
          birthdaySet: birthdayDay !== null && birthdayMonth !== null,
        },
        createdById: actor.userId,
      },
    ]);

    return {
      timezone,
      birthday_day: birthdayDay,
      birthday_month: birthdayMonth,
    };
  });
