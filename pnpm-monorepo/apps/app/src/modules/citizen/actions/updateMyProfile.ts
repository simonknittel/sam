"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  BIRTHDAY_DAY_MAX,
  BIRTHDAY_DAY_MIN,
  BIRTHDAY_MONTH_MAX,
  BIRTHDAY_MONTH_MIN,
  getMaximumDayOfMonth,
} from "../utils/birthday";
import { isSupportedTimezone, TIMEZONE_MAX_LENGTH } from "../utils/timezones";

/** Both selects submit an empty string when the citizen clears the value. */
const optionalWholeNumber = (minimum: number, maximum: number) =>
  z
    .string()
    .max(String(maximum).length)
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= minimum && value <= maximum),
    );

const schema = z.object({
  timezone: z
    .string()
    .max(TIMEZONE_MAX_LENGTH)
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || isSupportedTimezone(value)),
  birthdayDay: optionalWholeNumber(BIRTHDAY_DAY_MIN, BIRTHDAY_DAY_MAX),
  birthdayMonth: optionalWholeNumber(BIRTHDAY_MONTH_MIN, BIRTHDAY_MONTH_MAX),
});

export const updateMyProfile = createAuthenticatedAction(
  "updateMyProfile",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Further validate the request
     */
    const { timezone, birthdayDay, birthdayMonth } = data;

    if ((birthdayDay === null) !== (birthdayMonth === null))
      return {
        error: "Gib für den Geburtstag den Tag und den Monat an.",
        requestPayload: formData,
      };

    if (
      birthdayDay !== null &&
      birthdayMonth !== null &&
      birthdayDay > getMaximumDayOfMonth(birthdayMonth)
    )
      return {
        error: "Diesen Tag gibt es in dem gewählten Monat nicht.",
        requestPayload: formData,
      };

    /**
     * Update the citizen
     */
    const citizenId = authentication.session.entity.id;

    const currentCitizen = await prisma.entity.findUniqueOrThrow({
      where: { id: citizenId },
      select: { birthdayDay: true, birthdayMonth: true },
    });

    /**
     * A new birthday later in the same year must still be greeted, so the
     * marker of the last greeting is dropped whenever the date changes.
     */
    const isBirthdayChanged =
      currentCitizen.birthdayDay !== birthdayDay ||
      currentCitizen.birthdayMonth !== birthdayMonth;

    await prisma.entity.update({
      where: { id: citizenId },
      data: {
        timezone,
        birthdayDay,
        birthdayMonth,
        ...(isBirthdayChanged ? { birthdayGreetingSentAt: null } : {}),
      },
      select: { id: true },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_PROFILE_UPDATED,
        data: {
          citizenId,
          timezoneSet: timezone !== null,
          birthdaySet: birthdayDay !== null && birthdayMonth !== null,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/account/profile");
    revalidatePath("/app/dashboard");

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
