import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import {
  AuditEventType,
  CAN_LOGIN_CITIZEN_WHERE,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { shouldGreetCitizen } from "./newYearMatching";

/**
 * Bounds one run's work against the Lambda's timeout. Almost every citizen
 * of the organization turns the year within the same quarter of an hour,
 * thus the limit is much higher than the one of the birthday greeting.
 * Citizens above it keep their unset marker and are greeted by one of the
 * next runs.
 */
const MAX_GREETINGS_PER_RUN = 500;

/**
 * Greets every citizen when January 1 starts in their own time zone. The run
 * happens every 15 minutes, thus a greeting arrives within 15 minutes after
 * the local midnight.
 *
 * The citizens are marked before the events go out: a crash in between drops
 * a greeting, which is better than sending it twice.
 */
export const newYearGreetings = async () => {
  await captureAsyncFunc("newYearGreetings", async () => {
    const candidates = await prisma.entity.findMany({
      where: CAN_LOGIN_CITIZEN_WHERE,
      select: {
        id: true,
        timezone: true,
        newYearGreetingSentAt: true,
      },
    });

    const now = new Date();
    const greetable: typeof candidates = [];

    for (const candidate of candidates) {
      if (greetable.length >= MAX_GREETINGS_PER_RUN) break;

      try {
        if (shouldGreetCitizen(candidate, now)) greetable.push(candidate);
      } catch (error) {
        // A time zone the runtime does not know must not stop the sibling
        // citizens or the sibling jobs of this Lambda.
        void log.warn("Failed to check the turn of the year of a citizen", {
          citizenId: candidate.id,
          error,
        });
      }
    }

    void log.info("Checked the turn of the year", {
      candidateCount: candidates.length,
      greetableCount: greetable.length,
    });

    if (greetable.length === 0) return;

    await prisma.entity.updateMany({
      where: { id: { in: greetable.map((citizen) => citizen.id) } },
      data: { newYearGreetingSentAt: now },
    });

    await emitEvents(
      greetable.map((citizen) => ({
        Source: "frequent-automations",
        DetailType: "NotificationRequested",
        Detail: JSON.stringify({
          type: "NewYearGreeting",
          payload: {
            citizenId: citizen.id,
            // Saves the router from resolving the time zone a second time
            year: getLocalDate(now, citizen.timezone ?? ORGANIZATION_TIMEZONE)
              .year,
          },
          requestId: createId(),
        }),
      })),
    );

    await createAuditEvents([
      {
        type: AuditEventType.NEW_YEAR_GREETINGS_SENT,
        data: {
          citizenCount: greetable.length,
        },
      },
    ]);
  });
};
