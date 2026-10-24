import {
  ACTIVE_CITIZEN_WHERE,
  AuditEventType,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import {
  greetCitizens,
  GreetingMarkerField,
  type GreetingRunOutput,
} from "./greetCitizens.js";
import { shouldGreetForNewYear } from "./newYearGreetingRule.js";

/**
 * See `maximumPerRun` of `greetCitizens()`. Almost each citizen of the organization
 * starts the new year in the same quarter of an hour, thus the limit is much
 * higher than the limit of the birthday greeting.
 */
const MAXIMUM_NEW_YEAR_GREETINGS_PER_RUN = 500;

/**
 * Greets each cleared citizen (see `findClearedCitizens()`) when January 1
 * starts in their own time zone (see `greetCitizens()` for the run and the
 * markers).
 */
export const sendNewYearGreetings = (
  context: ApplicationContext,
): Promise<GreetingRunOutput> =>
  withSpan(context, "sendNewYearGreetings", async () => {
    return greetCitizens(context, {
      candidates: await context.prisma.citizen.findMany({
        where: ACTIVE_CITIZEN_WHERE,
        select: { id: true, timezone: true, newYearGreetingSentAt: true },
      }),
      maximumPerRun: MAXIMUM_NEW_YEAR_GREETINGS_PER_RUN,
      shouldGreet: shouldGreetForNewYear,
      markerField: GreetingMarkerField.NewYear,
      toNotification: (citizen, now) => ({
        type: "NewYearGreeting",
        payload: {
          citizenId: citizen.id,
          // Saves the router from resolving the time zone a second time
          year: getLocalDate(now, citizen.timezone ?? ORGANIZATION_TIMEZONE)
            .year,
        },
      }),
      auditType: AuditEventType.NEW_YEAR_GREETINGS_SENT,
    });
  });
