import { prisma } from "@/db";
import { env } from "@/env";
import { log } from "@/modules/logging";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { after } from "next/server";
import { serializeError } from "serialize-error";
import sharp from "sharp";
import { createS3Client } from "./createS3Client";
import { MAX_IMAGE_SIZE_BYTES } from "./uploadConstraints";

/**
 * Upper bound for plausible image dimensions. Anything larger is treated as
 * a probe error and not persisted.
 */
const MAX_DIMENSION_PX = 100_000;

/** Same bound the backfill script uses for its fetches */
const S3_REQUEST_TIMEOUT_MS = 30_000;

const isPlausibleDimension = (value: number | undefined): value is number =>
  value !== undefined &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_DIMENSION_PX;

/**
 * EXIF orientations 5-8 rotate the image by 90°. Browsers apply the
 * rotation when displaying (`image-orientation: from-image`), so the
 * persisted dimensions must be the displayed ones, not the stored ones.
 */
const swapsDimensions = (orientation: number | undefined) =>
  orientation !== undefined && orientation >= 5;

/**
 * Reads an image upload's intrinsic dimensions from the bucket and persists
 * them on the `Upload` row, after the response has been sent. Also corrects
 * the row's `size` with the object's actual one — the declared size is only
 * a client statement. Any failure is logged and leaves the row unchanged;
 * consumers fall back to rendering without dimensions.
 */
export const probeUploadImageDimensions = (uploadId: string) => {
  after(async () => {
    try {
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId },
        select: { mimeType: true, width: true },
      });
      if (
        !upload ||
        !upload.mimeType.startsWith("image/") ||
        upload.width !== null
      )
        return;

      const client = createS3Client();

      const head = await client.send(
        new HeadObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: uploadId,
        }),
        { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) },
      );
      if (
        head.ContentLength === undefined ||
        head.ContentLength > MAX_IMAGE_SIZE_BYTES
      ) {
        log.warn("Skipped image dimension probe for oversized upload", {
          uploadId,
          contentLength: head.ContentLength,
        });
        if (head.ContentLength !== undefined) {
          // Still replace the unverified client-declared size with the
          // object's actual one
          await prisma.upload.update({
            where: { id: uploadId },
            data: { size: head.ContentLength },
          });
        }
        return;
      }

      const object = await client.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: uploadId,
        }),
        { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) },
      );
      if (!object.Body) return;
      // Re-checked on the GET: the object can be replaced between the two
      // requests (the presigned PUT URL stays valid for a while)
      if (
        object.ContentLength !== undefined &&
        object.ContentLength > MAX_IMAGE_SIZE_BYTES
      ) {
        log.warn("Skipped image dimension probe for oversized upload", {
          uploadId,
          contentLength: object.ContentLength,
        });
        return;
      }
      const bytes = await object.Body.transformToByteArray();

      const metadata = await sharp(bytes).metadata();
      const width = swapsDimensions(metadata.orientation)
        ? metadata.height
        : metadata.width;
      const height = swapsDimensions(metadata.orientation)
        ? metadata.width
        : metadata.height;
      if (!isPlausibleDimension(width) || !isPlausibleDimension(height)) {
        log.warn("Image dimension probe returned implausible dimensions", {
          uploadId,
          width,
          height,
        });
        return;
      }

      await prisma.upload.update({
        where: { id: uploadId },
        data: { width, height, size: head.ContentLength },
      });
    } catch (error) {
      log.error("Failed to probe image dimensions of an upload", {
        uploadId,
        error: serializeError(error),
      });
    }
  });
};
