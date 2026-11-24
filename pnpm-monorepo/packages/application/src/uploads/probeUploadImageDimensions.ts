import { MAXIMUM_IMAGE_SIZE_BYTES } from "@sam-monorepo/domain";
import {
  FIRST_IMAGE_BYTES_LENGTH,
  type ApplicationContext,
} from "../context.js";
import { withSpan } from "../withSpan.js";
import { isImageUpload } from "./assignableUpload.js";

/**
 * The limit of plausible image dimensions. A larger value is an error of the
 * probe, which the probe does not save.
 */
const MAXIMUM_IMAGE_DIMENSION = 100_000;

/**
 * The probe runs after the response. A large image on a slow bucket can
 * take long, and nobody waits for it.
 */
const PROBE_READ_TIMEOUT_MILLISECONDS = 30_000;

const isPlausibleDimension = (value: number | undefined): value is number =>
  value !== undefined &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAXIMUM_IMAGE_DIMENSION;

/**
 * Never throws: a failure is logged and the row stays as it is. The renderers
 * then show the image without dimensions.
 */
export const probeUploadImageDimensions = (
  context: ApplicationContext,
  { uploadId }: { readonly uploadId: string },
): Promise<void> =>
  withSpan(context, "probeUploadImageDimensions", async () => {
    try {
      const { storage, images } = context;
      if (!storage || !images) {
        context.log.warn("The image probe is not configured", { uploadId });
        return;
      }

      const upload = await context.prisma.upload.findUnique({
        where: { id: uploadId },
        select: { mimeType: true, width: true },
      });
      if (!upload || !isImageUpload(upload) || upload.width !== null) return;

      const size = await storage.getObjectSize(uploadId);
      if (size === null || size > MAXIMUM_IMAGE_SIZE_BYTES) {
        context.log.warn("Skipped image dimension probe for oversized upload", {
          uploadId,
          contentLength: size,
        });
        // The size of the object replaces the declared size also here
        if (size !== null)
          await context.prisma.upload.update({
            where: { id: uploadId },
            data: { size },
          });
        return;
      }

      /**
       * The read checks the size of the whole object again: the object can
       * change between the two requests, because the presigned PUT URL
       * stays valid for some time
       */
      const readOptions = {
        maximumBytes: MAXIMUM_IMAGE_SIZE_BYTES,
        timeoutMilliseconds: PROBE_READ_TIMEOUT_MILLISECONDS,
      };
      const firstBytes = await storage.readObject(uploadId, {
        ...readOptions,
        byteRange: { first: 0, last: FIRST_IMAGE_BYTES_LENGTH - 1 },
      });
      if (!firstBytes) return;

      // A small object, or a storage that ignores the range, gives all bytes
      // with the first request
      const dimensions = await images.readDimensions(
        firstBytes,
        firstBytes.length < size
          ? () => storage.readObject(uploadId, readOptions)
          : undefined,
      );
      if (!dimensions) return;

      const { width, height } = dimensions;
      if (!isPlausibleDimension(width) || !isPlausibleDimension(height)) {
        context.log.warn(
          "Image dimension probe returned implausible dimensions",
          { uploadId, width, height },
        );
        return;
      }

      await context.prisma.upload.update({
        where: { id: uploadId },
        data: { width, height, size },
      });
    } catch (error) {
      context.log.error("Failed to probe image dimensions of an upload", {
        uploadId,
        error,
      });
    }
  });
