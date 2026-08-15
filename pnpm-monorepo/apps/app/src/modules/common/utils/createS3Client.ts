import { env } from "@/env";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * S3 client for the uploads bucket. The endpoint is either an explicit
 * S3_ENDPOINT (any S3-compatible provider without per-bucket domains, e.g.
 * the local SeaweedFS container — requires path-style addressing) or
 * derived from the Cloudflare R2 account id.
 */
export const createS3Client = () => {
  const endpoint =
    env.S3_ENDPOINT ??
    (env.S3_ACCOUNT_ID
      ? `https://${env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : null);
  if (!endpoint)
    throw new Error("S3 is not configured: set S3_ENDPOINT or S3_ACCOUNT_ID");

  return new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: env.S3_ENDPOINT !== undefined,
    /**
     * Since the SDK's data integrity protections (3.729.0), presigned PUT
     * URLs embed a CRC32 checksum of the empty command body. R2 ignores it,
     * but stricter S3-compatible providers (e.g. SeaweedFS) reject the
     * browser's actual upload body with BadDigest. WHEN_REQUIRED restores
     * the previous behavior — the recommended setting for S3-compatible
     * providers, including R2.
     */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
};
