import { prisma } from "@/db";
import { env } from "@/env";
import { log } from "@/modules/logging";
import {
  GetObjectCommand,
  HeadObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { after } from "next/server";
import { serializeError } from "serialize-error";
import { createS3Client } from "./createS3Client";
import { MAX_IMAGE_SIZE_BYTES } from "./uploadConstraints";

/**
 * Upper bound for plausible image dimensions. Anything larger is treated as
 * a probe error and not persisted.
 */
const MAX_DIMENSION_PX = 100_000;

/** Same bound the backfill script uses for its fetches */
const S3_REQUEST_TIMEOUT_MS = 30_000;

/**
 * PNG, JPEG and AVIF usually keep their dimensions in the first bytes of the
 * file, thus the probe reads only this part first. sharp can't read WebP,
 * GIF, TIFF, an AVIF with EXIF data or a JPEG with large metadata segments
 * (EXIF, ICC, XMP) from a part of the file. For these, the probe falls back
 * to the full object.
 */
export const FIRST_BYTES_LENGTH = 64 * 1024;

const isPlausibleDimension = (value: number | undefined): value is number =>
  value !== undefined &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_DIMENSION_PX;

/**
 * Browsers apply the EXIF orientation when displaying
 * (`image-orientation: from-image`), so the persisted dimensions must be the
 * displayed ones (`autoOrient`), not the stored ones.
 */
const readDisplayedDimensions = async (bytes: Uint8Array) => {
  /** Loaded on demand: only this background task needs the large module */
  const { default: sharp } = await import("sharp");

  const metadata = await sharp(bytes).metadata();
  return metadata.autoOrient;
};

/**
 * Reads the displayed dimensions from the first bytes of an image. If sharp
 * can't read them from this part, it reads them from all bytes. Without
 * `getAllBytes`, the first bytes must be the full image.
 *
 * Exported for tests
 */
export const readImageDimensions = async (
  firstBytes: Uint8Array,
  getAllBytes?: () => Promise<Uint8Array | null>,
) => {
  if (!getAllBytes) return readDisplayedDimensions(firstBytes);

  try {
    return await readDisplayedDimensions(firstBytes);
  } catch {
    const allBytes = await getAllBytes();
    if (!allBytes) return null;
    return readDisplayedDimensions(allBytes);
  }
};

/**
 * The size of the whole object. For a range request, `ContentLength` is the
 * length of the range, and `ContentRange` ("bytes 0-65535/1234567") gives
 * the size of the whole object.
 */
const getObjectSize = ({
  ContentLength,
  ContentRange,
}: {
  readonly ContentLength?: number;
  readonly ContentRange?: string;
}) => {
  const totalSize = ContentRange?.split("/")[1];
  return totalSize && totalSize !== "*" ? Number(totalSize) : ContentLength;
};

const getObjectBytes = async (
  client: S3Client,
  uploadId: string,
  range?: string,
) => {
  const object = await client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: uploadId,
      Range: range,
    }),
    { abortSignal: AbortSignal.timeout(S3_REQUEST_TIMEOUT_MS) },
  );
  if (!object.Body) return null;
  // Re-checked on the GET: the object can be replaced between the HEAD and
  // the GET requests (the presigned PUT URL stays valid for a while)
  const objectSize = getObjectSize(object);
  if (objectSize !== undefined && objectSize > MAX_IMAGE_SIZE_BYTES) {
    log.warn("Skipped image dimension probe for oversized upload", {
      uploadId,
      contentLength: objectSize,
    });
    return null;
  }
  return object.Body.transformToByteArray();
};

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

      const firstBytes = await getObjectBytes(
        client,
        uploadId,
        `bytes=0-${FIRST_BYTES_LENGTH - 1}`,
      );
      if (!firstBytes) return;

      // A small object (or a provider that ignores the range) returns all
      // bytes on the first request already
      const dimensions = await readImageDimensions(
        firstBytes,
        firstBytes.length < head.ContentLength
          ? () => getObjectBytes(client, uploadId)
          : undefined,
      );
      if (!dimensions) return;

      const { width, height } = dimensions;
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
