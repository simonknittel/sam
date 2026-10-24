import { AuditEventType } from "@sam-monorepo/domain";
import { findClearedCitizens } from "../auth/clearedCitizens.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { shouldGreetOnBirthday } from "./birthdayGreetingRule.js";
import {
  greetCitizens,
  GreetingMarkerField,
  type GreetingRunOutput,
} from "./greetCitizens.js";

/** See `maximumPerRun` of `greetCitizens()` */
const MAXIMUM_BIRTHDAY_GREETINGS_PER_RUN = 100;

/**
 * Greets each cleared citizen (see `findClearedCitizens()`) whose birthday
 * starts in their own time zone (see `greetCitizens()` for the run and the
 * markers).
 */
export const sendBirthdayGreetings = (
  context: ApplicationContext,
): Promise<GreetingRunOutput> =>
  withSpan(context, "sendBirthdayGreetings", async () => {
    const clearedCitizens = await findClearedCitizens(context, {
      birthdayDay: { not: null },
      birthdayMonth: { not: null },
    });

    return greetCitizens(context, {
      candidates: await context.prisma.citizen.findMany({
        where: { id: { in: [...clearedCitizens.keys()] } },
        select: {
          id: true,
          timezone: true,
          birthdayDay: true,
          birthdayMonth: true,
          birthdayGreetingSentAt: true,
        },
      }),
      maximumPerRun: MAXIMUM_BIRTHDAY_GREETINGS_PER_RUN,
      shouldGreet: shouldGreetOnBirthday,
      markerField: GreetingMarkerField.Birthday,
      toNotification: (citizen) => ({
        type: "BirthdayGreeting",
        payload: { citizenId: citizen.id },
      }),
      auditType: AuditEventType.BIRTHDAY_GREETINGS_SENT,
    });
  });
