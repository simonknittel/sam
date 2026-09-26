"use server";

import { createAdminAction } from "@/modules/actions/utils/createAdminAction";
import { getServerCookieOptions } from "@/modules/common/utils/getServerCookieOptions";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  formatSeasonalDateOverrideCookie,
  parseSeasonalDateOverrideCookie,
  SEASONAL_DATE_COOKIE,
  SEASONAL_DATE_COOKIE_MAX_AGE,
  SEASONAL_DATE_LENGTH,
} from "../utils/seasonalDateOverrideCookie";

const schema = z.object({
  /** `YYYY-MM-DD`, or empty to remove the override */
  date: z.string().max(SEASONAL_DATE_LENGTH),
});

export const setSeasonalDateOverride = createAdminAction(
  "setSeasonalDateOverride",
  schema,
  async (formData, authentication, data, t) => {
    const cookieStore = await cookies();

    if (data.date === "") {
      cookieStore.delete(SEASONAL_DATE_COOKIE);

      return {
        success: t("Common.successfullySaved"),
      };
    }

    const localDate = parseSeasonalDateOverrideCookie(data.date);
    if (!localDate)
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };

    cookieStore.set(
      SEASONAL_DATE_COOKIE,
      formatSeasonalDateOverrideCookie(localDate),
      getServerCookieOptions(SEASONAL_DATE_COOKIE_MAX_AGE),
    );

    return {
      success: t("Common.successfullySaved"),
    };
  },
);
