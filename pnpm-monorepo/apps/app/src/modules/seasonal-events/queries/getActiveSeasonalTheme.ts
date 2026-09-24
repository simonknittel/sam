import "server-only";

import { prisma } from "@/db";
import { env } from "@/env";
import { authenticate } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  getActiveSeasonalEvent,
  getLocalDate,
  isSeasonalGreetingDay,
  ORGANIZATION_TIMEZONE,
  SeasonalEventKey,
  type LocalDate,
} from "@sam-monorepo/domain";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { serializeError } from "serialize-error";
import { SEASONAL_THEMES } from "../utils/SEASONAL_THEMES";
import {
  parseSeasonalDateOverrideCookie,
  SEASONAL_DATE_COOKIE,
} from "../utils/seasonalDateOverrideCookie";
import type { SeasonalThemeResolution } from "../utils/types";

/** The values a `.env` file can use to switch the date override on */
const OVERRIDE_ENABLED_VALUES: readonly string[] = ["1", "true"];

const readDateOverride = async () => {
  const overrideEnabled = OVERRIDE_ENABLED_VALUES.includes(
    env.SEASONAL_DATE_OVERRIDE_ENABLED ?? "",
  );

  const cookieValue = overrideEnabled
    ? (await cookies()).get(SEASONAL_DATE_COOKIE)?.value
    : undefined;

  return parseSeasonalDateOverrideCookie(cookieValue, overrideEnabled);
};

/** The values of a citizen which the resolution needs */
interface ViewerCitizen {
  readonly timezone: string | null;
  readonly switchedOffEventKeys: readonly string[];
}

/** A viewer without a citizen, for example the login page */
const VIEWER_WITHOUT_CITIZEN: ViewerCitizen = {
  timezone: null,
  switchedOffEventKeys: [],
};

/**
 * The time zone and the opt-outs of the citizen. No page must fail because
 * of a decoration, and this read is the only one the resolution makes, thus
 * a failed read — a release which arrives before its migration, for example
 * — yields no citizen and therefore no theme.
 */
const readViewerCitizen = async (
  citizenId: string,
): Promise<ViewerCitizen | null> => {
  try {
    const citizen = await prisma.entity.findUnique({
      where: { id: citizenId },
      select: {
        timezone: true,
        seasonalThemeSettings: {
          // The event key is a free string in the database, thus the
          // query keeps the rows of the known events only.
          where: { eventKey: { in: Object.values(SeasonalEventKey) } },
          select: { eventKey: true },
        },
      },
    });
    if (!citizen) return null;

    return {
      timezone: citizen.timezone,
      switchedOffEventKeys: citizen.seasonalThemeSettings.map(
        (setting) => setting.eventKey,
      ),
    };
  } catch (error) {
    unstable_rethrow(error);

    log.warn("Failed to read the citizen of the seasonal theme", {
      citizenId,
      error: serializeError(error),
    });

    return null;
  }
};

/**
 * The date of the viewer, in their own time zone. The shared rule throws for
 * a time zone the runtime does not know, and no page must fail because of a
 * decoration; such a viewer gets no theme.
 */
const getViewerLocalDate = (
  timezone: string | null,
  citizenId: string | undefined,
): LocalDate | null => {
  try {
    return getLocalDate(new Date(), timezone ?? ORGANIZATION_TIMEZONE);
  } catch (error) {
    unstable_rethrow(error);

    log.warn("Failed to resolve the local date for the seasonal theme", {
      citizenId,
      error: serializeError(error),
    });

    return null;
  }
};

/**
 * The seasonal theme of this request, or nothing outside every theme range.
 * Every surface which draws something seasonal calls this query itself: it
 * is scoped to the request, thus the session, the citizen and the calendar
 * are read once, and no surface needs a prop or a context.
 *
 * A viewer without a citizen — the login page, for example — resolves with
 * the time zone of the organization and without opt-outs.
 */
export const getActiveSeasonalTheme = cache(
  withTrace(
    "getActiveSeasonalTheme",
    async (): Promise<SeasonalThemeResolution | null> => {
      const [authentication, overrideDate] = await Promise.all([
        authenticate(),
        readDateOverride(),
      ]);

      // `authenticate()` answers `false` without a session, which optional
      // chaining does not cover.
      const citizenId = authentication
        ? authentication.session.entity?.id
        : undefined;

      const citizen = citizenId
        ? await readViewerCitizen(citizenId)
        : VIEWER_WITHOUT_CITIZEN;
      // A citizen the query could not read leaves the theme out: neither
      // their time zone nor their opt-outs are known.
      if (!citizen) return null;

      const localDate =
        overrideDate ?? getViewerLocalDate(citizen.timezone, citizenId);
      if (!localDate) return null;

      const event = getActiveSeasonalEvent(localDate);
      if (!event) return null;

      if (citizen.switchedOffEventKeys.includes(event)) return null;

      return {
        event,
        theme: SEASONAL_THEMES[event],
        localDate,
        isGreetingDay: isSeasonalGreetingDay(event, localDate),
      };
    },
  ),
);
