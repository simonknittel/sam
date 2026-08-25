import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sam-monorepo/database";
import { AuditEventType, CAN_LOGIN_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { emitEvents } from "../common/eventbridge";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { shouldGreetCitizen } from "./birthdayMatching";

/**
 * Bounds one run's work against the Lambda's timeout. Citizens above the
 * limit keep their unset marker and are greeted by one of the next runs.
 */
const MAX_GREETINGS_PER_RUN = 100;
/** PutEvents accepts at most 10 entries per call */
const EVENTBRIDGE_BATCH_SIZE = 10;

/**
 * Greets every citizen whose birthday starts in their own time zone. The run
 * happens every 15 minutes, thus a greeting arrives within 15 minutes after
 * the local midnight.
 *
 * The citizens are marked before the events go out: a crash in between drops
 * a greeting, which is better than sending it twice.
 */
export const birthdayGreetings = async () => {
  await captureAsyncFunc("birthdayGreetings", async () => {
    const candidates = await prisma.entity.findMany({
      where: {
        AND: [
          { birthdayDay: { not: null } },
          { birthdayMonth: { not: null } },
          CAN_LOGIN_CITIZEN_WHERE,
        ],
      },
      select: {
        id: true,
        timezone: true,
        birthdayDay: true,
        birthdayMonth: true,
        birthdayGreetingSentAt: true,
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
        void log.warn("Failed to check the birthday of a citizen", {
          citizenId: candidate.id,
          error,
        });
      }
    }

    void log.info("Checked birthdays", {
      candidateCount: candidates.length,
      greetableCount: greetable.length,
    });

    if (greetable.length === 0) return;

    await prisma.entity.updateMany({
      where: { id: { in: greetable.map((citizen) => citizen.id) } },
      data: { birthdayGreetingSentAt: now },
    });

    for (
      let index = 0;
      index < greetable.length;
      index += EVENTBRIDGE_BATCH_SIZE
    ) {
      await emitEvents(
        greetable
          .slice(index, index + EVENTBRIDGE_BATCH_SIZE)
          .map((citizen) => ({
            Source: "frequent-automations",
            DetailType: "NotificationRequested",
            Detail: JSON.stringify({
              type: "BirthdayGreeting",
              payload: {
                citizenId: citizen.id,
              },
              requestId: createId(),
            }),
          })),
      );
    }

    await createAuditEvents([
      {
        type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
        data: {
          citizenCount: greetable.length,
        },
      },
    ]);
  });
};
