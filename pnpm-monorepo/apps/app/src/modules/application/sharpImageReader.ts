import type {
  ApplicationContext,
  ImageDimensions,
} from "@sam-monorepo/application";

/**
 * A browser applies the EXIF orientation when it shows an image
 * (`image-orientation: from-image`). Thus the saved dimensions must be the
 * shown dimensions (`autoOrient`), not the stored dimensions.
 */
const readDisplayedDimensions = async (
  bytes: Uint8Array,
): Promise<ImageDimensions> => {
  /** Loaded on demand: only the image probe needs the large module */
  const { default: sharp } = await import("sharp");

  const metadata = await sharp(bytes).metadata();
  return metadata.autoOrient;
};

/** Without `readAllBytes`, the first bytes must be the full image. */
export const readImageDimensions = async (
  firstBytes: Uint8Array,
  readAllBytes?: () => Promise<Uint8Array | null>,
): Promise<ImageDimensions | null> => {
  if (!readAllBytes) return readDisplayedDimensions(firstBytes);

  try {
    return await readDisplayedDimensions(firstBytes);
  } catch {
    const allBytes = await readAllBytes();
    if (!allBytes) return null;
    return readDisplayedDimensions(allBytes);
  }
};

export const sharpImageReader: NonNullable<ApplicationContext["images"]> = {
  readDimensions: readImageDimensions,
};
