import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";

/**
 * How long an expired session sticks around before it is deleted. Until then
 * the account's session list still shows it under its "expired" filter, which
 * is what lets a citizen spot a sign-in they don't recognize after it already
 * ended.
 */
const SESSION_RETENTION_DAYS = 30;

/**
 * Deletes authentication records that have outlived their `expires`
 * timestamp. None of them grant anything anymore — NextAuth treats an expired
 * session as signed out and both token lookups filter on `expires` — so they
 * would otherwise pile up in their tables forever.
 *
 * Expired sessions are kept for another 30 days for the account's session
 * list. The tokens are never shown anywhere and are deleted as soon as they
 * expire.
 */
export const purgeExpiredAuthenticationRecords = async () => {
  await captureAsyncFunc("purgeExpiredAuthenticationRecords", async () => {
    const now = new Date();

    const sessionCutoff = new Date(now);
    sessionCutoff.setDate(sessionCutoff.getDate() - SESSION_RETENTION_DAYS);

    const { count: sessionCount } = await captureAsyncFunc(
      "delete expired sessions",
      () =>
        prisma.session.deleteMany({
          where: { expires: { lt: sessionCutoff } },
        }),
    );

    const { count: verificationTokenCount } = await captureAsyncFunc(
      "delete expired verification tokens",
      () =>
        prisma.verificationToken.deleteMany({
          where: { expires: { lt: now } },
        }),
    );

    const { count: emailConfirmationTokenCount } = await captureAsyncFunc(
      "delete expired email confirmation tokens",
      () =>
        prisma.emailConfirmationToken.deleteMany({
          where: { expires: { lt: now } },
        }),
    );

    if (
      sessionCount <= 0 &&
      verificationTokenCount <= 0 &&
      emailConfirmationTokenCount <= 0
    )
      return;

    log.info("Purged expired authentication records", {
      sessionCount,
      verificationTokenCount,
      emailConfirmationTokenCount,
    });

    await createAuditEvents([
      {
        type: AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED,
        data: {
          sessionCount,
          verificationTokenCount,
          emailConfirmationTokenCount,
        },
      },
    ]);
  });
};
