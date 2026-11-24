import {
  AuditEventType,
  ORGANIZATION_TIMEZONE,
  subtractCalendarDays,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

/**
 * How long an expired session sticks around before it is deleted. Until then
 * the session list of the account still shows it under its "expired" filter,
 * which lets a citizen see a sign-in that they do not know after it ended.
 */
const SESSION_RETENTION_DAYS = 30;

export interface PurgeExpiredAuthenticationRecordsOutput {
  readonly sessionCount: number;
  readonly verificationTokenCount: number;
  readonly emailConfirmationTokenCount: number;
}

/**
 * None of the records grants anything: the sign-in treats an expired session as
 * signed out, and both token lookups filter on `expires`. The tokens are never
 * shown, thus they are deleted as soon as they expire.
 */
export const purgeExpiredAuthenticationRecords = (
  context: ApplicationContext,
): Promise<PurgeExpiredAuthenticationRecordsOutput> =>
  withSpan(context, "purgeExpiredAuthenticationRecords", async () => {
    const now = context.now();
    const sessionCutoff = subtractCalendarDays(
      now,
      SESSION_RETENTION_DAYS,
      ORGANIZATION_TIMEZONE,
    );

    const { count: sessionCount } = await context.prisma.session.deleteMany({
      where: { expires: { lt: sessionCutoff } },
    });

    const { count: verificationTokenCount } =
      await context.prisma.verificationToken.deleteMany({
        where: { expires: { lt: now } },
      });

    const { count: emailConfirmationTokenCount } =
      await context.prisma.emailConfirmationToken.deleteMany({
        where: { expires: { lt: now } },
      });

    const counts = {
      sessionCount,
      verificationTokenCount,
      emailConfirmationTokenCount,
    };

    if (Object.values(counts).some((count) => count > 0))
      await context.audit.create([
        {
          type: AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED,
          data: counts,
          createdById: null,
        },
      ]);

    return counts;
  });
