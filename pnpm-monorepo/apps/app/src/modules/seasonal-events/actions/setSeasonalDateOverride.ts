"use server";

import {
  ActionGate,
  createAuthenticatedAction,
} from "@/modules/actions/utils/createAction";
import { getServerCookieOptions } from "@/modules/common/utils/getServerCookieOptions";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SEASONAL_DATE_COOKIE,
  SEASONAL_DATE_COOKIE_MAX_AGE,
  seasonalDateSchema,
} from "../utils/seasonalDateOverrideCookie";

const schema = z.object({
  /** Empty removes the override */
  date: z.union([seasonalDateSchema, z.literal("")]),
});

export const setSeasonalDateOverride = createAuthenticatedAction(
  "setSeasonalDateOverride",
  schema,
  async (formData, authentication, data, t) => {
    const cookieStore = await cookies();

    if (data.date === "") {
      cookieStore.delete(SEASONAL_DATE_COOKIE);
    } else {
      cookieStore.set(
        SEASONAL_DATE_COOKIE,
        data.date,
        getServerCookieOptions(SEASONAL_DATE_COOKIE_MAX_AGE),
      );
    }

    return {
      success: t("Common.successfullySaved"),
    };
  },
  { gate: ActionGate.Admin },
);
