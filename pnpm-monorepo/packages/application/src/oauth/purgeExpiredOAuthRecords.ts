import { AuditEventType } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS } from "./constants.js";
import { resetStaleGrantAdminModes } from "./resetStaleGrantAdminModes.js";

/** 24 hours after its expiry, a cached client metadata document is deleted */
const CLIENT_METADATA_RETENTION_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface PurgeExpiredOAuthRecordsOutput {
  readonly authorizationCodeCount: number;
  readonly refreshTokenCount: number;
  readonly grantCount: number;
  readonly clientMetadataCount: number;
  /** See `resetStaleGrantAdminModes()`, with its own audit events */
  readonly adminModeResetCount: number;
}

/**
 * Deletes the OAuth records of the MCP server that grant nothing anymore at
 * the time of the run:
 *
 * - Expired authorization codes that the client did not redeem. A used code
 *   stays with its grant, thus its reuse still revokes the grant.
 * - Expired refresh tokens. A used refresh token expires 31 days after its
 *   issue, like an unused one. Until then, its reuse revokes the grant.
 * - Grants without a refresh token and without an unexpired code: grants of
 *   an abandoned or failed authorization, revoked grants and grants whose
 *   tokens all expired. Their codes are deleted with them.
 * - Cached client metadata documents that expired more than 24 hours ago.
 *   The app does not use an expired document: the next consent of the
 *   client fetches the document again.
 *
 * It also turns off the admin mode of the grants of users who are not
 * admins anymore (see `resetStaleGrantAdminModes()`).
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
