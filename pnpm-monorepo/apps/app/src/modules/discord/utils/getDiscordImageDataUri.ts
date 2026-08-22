import "server-only";

import { env } from "@/env";
import { createS3Client } from "@/modules/common/utils/createS3Client";
import { log } from "@/modules/logging";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { serializeError } from "serialize-error";

/**
 * Discord's image data only accepts these three.
 * https://discord.com/developers/docs/reference#image-data
 */
const SUPPORTED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
];

/**
 * Caps what one publish buffers into memory and keeps the request body
 * within what Discord accepts — base64 inflates these bytes by a third.
 */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Same bound the dimension probe uses for its bucket reads */
const S3_REQUEST_TIMEOUT_MS = 30_000;

interface Upload {
  readonly id: string;
  readonly mimeType: string;
}

/**
 * The `data:` URI Discord wants for a scheduled event's cover — it does not
 * accept image URLs, so the object is read from the bucket and re-encoded.
 *
 * Returns undefined whenever the cover cannot be delivered (unsupported
 * format, too large, bucket unreachable). Callers pass that on unchanged, so
 * the publish continues without touching Discord's copy of the image.
 */
export const getDiscordImageDataUri = async (
  upload: Upload,
): Promise<string | undefined> => {
  if (!SUPPORTED_MIME_TYPES.includes(upload.mimeType)) {
    log.info("Skipped a Discord cover image of an unsupported format", {
      uploadId: upload.id,
      mimeType: upload.mimeType,
    });
    return undefined;
  }

  try {
    const client = createS3Client();
    const object = await client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: upload.id,
      }),
      { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) },
    );
    if (!object.Body) return undefined;

    if (
      object.ContentLength !== undefined &&
      object.ContentLength > MAX_IMAGE_BYTES
    ) {
      log.info("Skipped an oversized Discord cover image", {
        uploadId: upload.id,
        contentLength: object.ContentLength,
      });
      return undefined;
    }

    const bytes = await object.Body.transformToByteArray();
    /**
     * The declared length is only a header; a lying or absent one must not
     * let an unbounded object through.
     */
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      log.info("Skipped an oversized Discord cover image", {
        uploadId: upload.id,
        contentLength: bytes.byteLength,
      });
      return undefined;
    }

    return `data:${upload.mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch (error) {
    log.error("Failed to encode a Discord cover image", {
      uploadId: upload.id,
      error: serializeError(error),
    });
    return undefined;
  }
};
