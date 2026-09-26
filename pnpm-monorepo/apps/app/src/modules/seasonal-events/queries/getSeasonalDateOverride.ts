import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import {
  parseSeasonalDateOverrideCookie,
  SEASONAL_DATE_COOKIE,
} from "../utils/seasonalDateOverrideCookie";

/** The date the seasonal date override cookie of this request names */
export const getSeasonalDateOverride = cache(async () =>
  parseSeasonalDateOverrideCookie(
    (await cookies()).get(SEASONAL_DATE_COOKIE)?.value,
  ),
);
