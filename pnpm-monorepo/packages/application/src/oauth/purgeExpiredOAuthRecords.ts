import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS } from "./constants.js";
import { resetStaleGrantAdminModes } from "./resetStaleGrantAdminModes.js";

const CLIENT_METADATA_RETENTION_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface PurgeExpiredOAuthRecordsOutput {
  readonly authorizationCodeCount: number;
  readonly refreshTokenCount: number;
  readonly grantCount: number;
  readonly clientMetadataCount: number;
  /** With its own audit events */
  readonly adminModeResetCount: number;
}

/**
 * A used code stays with its grant, and a used refresh token stays until its
 * expiry, thus their reuse still revokes the grant. A grant goes when it has no
 * refresh token and no unexpired code: an abandoned or failed authorization, a
 * revoked grant, or a grant whose tokens all expired.
 */
export const purgeExpiredOAuthRecords = (
  context: ApplicationContext,
): Promise<PurgeExpiredOAuthRecordsOutput> =>
  withSpan(context, "purgeExpiredOAuthRecords", async () => {
    const now = context.now();
    const { count: authorizationCodeCount } =
      await context.prisma.oAuthAuthorizationCode.deleteMany({
        where: { usedAt: null, expiresAt: { lt: now } },
      });

    const { count: refreshTokenCount } =
      await context.prisma.oAuthRefreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });

    // A grant without a refresh token can be in the redemption of its code.
    // The code expires 10 minutes after the creation of the grant, thus an
    // older grant cannot get a refresh token anymore.
    const grantCutoff = new Date(
      now.getTime() - AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS,
    );
    const { count: grantCount } = await context.prisma.oAuthGrant.deleteMany({
      where: {
        createdAt: { lt: grantCutoff },
        refreshTokens: { none: {} },
        authorizationCodes: { none: { expiresAt: { gte: now } } },
      },
    });

    const clientMetadataCutoff = new Date(
      now.getTime() - CLIENT_METADATA_RETENTION_IN_MILLISECONDS,
    );
    const { count: clientMetadataCount } =
      await context.prisma.oAuthClientMetadata.deleteMany({
        where: { expiresAt: { lt: clientMetadataCutoff } },
      });

    const counts = {
      authorizationCodeCount,
      refreshTokenCount,
      grantCount,
      clientMetadataCount,
    };

    if (Object.values(counts).some((count) => count > 0))
      await context.audit.create([
        {
          type: AuditEventType.OAUTH_RECORDS_PURGED,
          data: counts,
          createdById: null,
        },
      ]);

    const adminModeResetCount = await resetStaleGrantAdminModes(context);

    return { ...counts, adminModeResetCount };
  });
