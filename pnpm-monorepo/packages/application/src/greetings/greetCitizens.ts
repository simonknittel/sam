import type { AuditEventType } from "@sam-monorepo/domain";
import { findClearedCitizens } from "../auth/clearedCitizens.js";
import type { ApplicationContext, Notification } from "../context.js";
import { triggerNotificationsAfterSave } from "../notifications.js";

/** The column of a citizen that records the last greeting of one kind */
export enum GreetingMarkerField {
  Birthday = "birthdayGreetingSentAt",
  NewYear = "newYearGreetingSentAt",
}

export interface GreetingRunOutput {
  /** The citizens that the rule of the greeting checked */
  readonly candidateCount: number;
  readonly greetedCount: number;
  readonly notificationsSent: boolean;
}

interface GreetingRun<Candidate extends { readonly id: string }> {
  readonly candidates: readonly Candidate[];
  /**
   * Bounds the work of one run against the time limit of the Lambda
   * function. The citizens above the limit keep their unset marker, and one
   * of the next runs greets them.
   */
  readonly maximumPerRun: number;
  /** Throws for a time zone that the runtime does not know */
  readonly shouldGreet: (candidate: Candidate, now: Date) => boolean;
  readonly markerField: GreetingMarkerField;
  readonly toNotification: (candidate: Candidate, now: Date) => Notification;
  readonly auditType:
    | AuditEventType.BIRTHDAY_GREETINGS_SENT
    | AuditEventType.NEW_YEAR_GREETINGS_SENT;
}

/**
 * Greets the candidates that the rule selects right now and that are cleared
 * (see `findClearedCitizens()`). The clearance is checked only for the
 * candidates that the rule selects, because the rule is cheap and selects
 * few. The run happens
 * every 15 minutes, thus a greeting arrives at most 15 minutes after the
 * local midnight of the citizen.
 *
 * The citizens get their marker before the notifications go out: a crash
 * between the two steps drops a greeting, which is better than a second
 * greeting. For the same reason, a failed request of the notifications keeps
 * the markers. Then the log has the failure, and the run writes no audit
 * event, because no greeting went out.
 */
export const greetCitizens = async <Candidate extends { readonly id: string }>(
  context: ApplicationContext,
  {
    candidates,
    maximumPerRun,
    shouldGreet,
    markerField,
    toNotification,
    auditType,
  }: GreetingRun<Candidate>,
): Promise<GreetingRunOutput> => {
  const now = context.now();
  const due: Candidate[] = [];

  for (const candidate of candidates) {
    try {
      if (shouldGreet(candidate, now)) due.push(candidate);
    } catch (error) {
      // A time zone that the runtime does not know must not stop the other
      // citizens or the other jobs of the Lambda function.
      context.log.warn("Failed to check the greeting rule of a citizen", {
        citizenId: candidate.id,
        auditType,
        error,
      });
    }
  }

  const clearedCitizens =
    due.length > 0
      ? await findClearedCitizens(context, {
          id: { in: due.map((citizen) => citizen.id) },
        })
      : new Map();
  const greetable = due
    .filter((citizen) => clearedCitizens.has(citizen.id))
    .slice(0, maximumPerRun);

  if (greetable.length === 0)
    return {
      candidateCount: candidates.length,
      greetedCount: 0,
      notificationsSent: true,
    };

  await context.prisma.citizen.updateMany({
    where: { id: { in: greetable.map((citizen) => citizen.id) } },
    data: { [markerField]: now },
  });

  const notificationsSent = await triggerNotificationsAfterSave(
    context,
    greetable.map((citizen) => toNotification(citizen, now)),
  );

  if (notificationsSent)
    await context.audit.create([
      {
        type: auditType,
        data: { citizenCount: greetable.length },
        createdById: null,
      },
    ]);

  return {
    candidateCount: candidates.length,
    greetedCount: greetable.length,
    notificationsSent,
  };
};
