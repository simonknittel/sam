import { S3Client } from "@aws-sdk/client-s3";

const CONNECTION_TIMEOUT_MILLISECONDS = 5_000;

/**
 * The longest timeout of a single storage operation (a copy or a delete). A
 * caller that needs a shorter time passes an `abortSignal` to `send()`.
 */
const REQUEST_TIMEOUT_MILLISECONDS = 30_000;

const R2_ENDPOINT_DOMAIN = "r2.cloudflarestorage.com";

interface S3Credentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

export type S3ClientOptions =
  | {
      /** The account of Cloudflare R2. Its endpoint has a domain for each bucket. */
      readonly accountId: string;
      readonly credentials: S3Credentials;
    }
  | {
      /**
       * The endpoint of an S3-compatible provider without a domain for each
       * bucket (for example the local RustFS container). The client uses
       * path-style addressing.
       */
      readonly endpoint: string;
      readonly credentials: S3Credentials;
    };

export const createS3Client = (options: S3ClientOptions): S3Client =>
  new S3Client({
    region: "auto",
    endpoint:
      "accountId" in options
        ? new URL(`https://${options.accountId}.${R2_ENDPOINT_DOMAIN}`).origin
        : options.endpoint,
    forcePathStyle: "endpoint" in options,
    /*
     * With the default of the SDK, presigned PUT URLs embed a CRC32 checksum
     * of the empty command body. R2 ignores it, but stricter S3-compatible
     * providers reject the actual upload body of the browser with BadDigest.
     */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: options.credentials,
    requestHandler: {
      connectionTimeout: CONNECTION_TIMEOUT_MILLISECONDS,
      requestTimeout: REQUEST_TIMEOUT_MILLISECONDS,
      // See `createEventBridgeClient()`
      throwOnRequestTimeout: true,
    },
  });
