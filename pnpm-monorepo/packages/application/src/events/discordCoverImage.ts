import type { ApplicationContext } from "../context.js";

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
const MAXIMUM_COVER_IMAGE_BYTES = 8 * 1024 * 1024;

interface CoverImage {
  readonly id: string;
  readonly mimeType: string;
}

/**
 * Discord does not accept image URLs for the cover. Undefined when the cover
 * cannot be delivered: callers pass that on unchanged, so the publish continues
 * without touching Discord's copy of the image.
 */
export const readDiscordCoverImage = async (
  context: Pick<ApplicationContext, "storage" | "log">,
  upload: CoverImage,
): Promise<string | undefined> => {
  if (!SUPPORTED_MIME_TYPES.includes(upload.mimeType)) {
    context.log.info("Skipped a Discord cover image of an unsupported format", {
      uploadId: upload.id,
      mimeType: upload.mimeType,
    });
    return undefined;
  }

  if (!context.storage) {
    context.log.warn("Skipped a Discord cover image without a file storage", {
      uploadId: upload.id,
    });
    return undefined;
  }

  try {
    const bytes = await context.storage.readObject(upload.id, {
      maximumBytes: MAXIMUM_COVER_IMAGE_BYTES,
    });
    if (!bytes) {
      context.log.info("Skipped an empty or oversized Discord cover image", {
        uploadId: upload.id,
      });
      return undefined;
    }

    return `data:${upload.mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch (error) {
    context.log.error("Failed to encode a Discord cover image", {
      uploadId: upload.id,
      error,
    });
    return undefined;
  }
};
