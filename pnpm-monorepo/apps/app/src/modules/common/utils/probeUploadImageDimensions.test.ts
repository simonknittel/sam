import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { describe, expect, test, vi } from "vitest";
import {
  FIRST_BYTES_LENGTH,
  readImageDimensions,
} from "./probeUploadImageDimensions";

/** Rotates the displayed image by 90°, thus width and height swap */
const ROTATED_ORIENTATION = 6;

/**
 * Noise does not compress, thus each sample is larger than the first bytes
 * that the probe reads
 */
const createNoise = () =>
  sharp(randomBytes(400 * 300 * 3), {
    raw: { width: 400, height: 300, channels: 3 },
  });

/**
 * A high quality keeps the AVIF noise larger than the first bytes. The lowest
 * effort keeps the test fast.
 */
const AVIF_OPTIONS = { quality: 90, effort: 0 };

describe("read image dimensions", () => {
  test.each([
    {
      format: "PNG",
      create: () =>
        createNoise().png().withMetadata({ orientation: ROTATED_ORIENTATION }),
      isReadFromFirstBytes: true,
    },
    {
      format: "JPEG",
      create: () =>
        createNoise().jpeg().withMetadata({ orientation: ROTATED_ORIENTATION }),
      isReadFromFirstBytes: true,
    },
    {
      /** The embedded CMYK profile of libvips has approximately 1 MB */
      format: "JPEG with an ICC profile larger than the first bytes",
      create: () =>
        createNoise()
          .withMetadata({ orientation: ROTATED_ORIENTATION, icc: "cmyk" })
          .jpeg(),
      isReadFromFirstBytes: false,
    },
    {
      format: "WebP",
      create: () =>
        createNoise().webp().withMetadata({ orientation: ROTATED_ORIENTATION }),
      isReadFromFirstBytes: false,
    },
    {
      format: "GIF",
      create: () => createNoise().rotate(90).gif(),
      isReadFromFirstBytes: false,
    },
    {
      format: "AVIF",
      create: () => createNoise().rotate(90).avif(AVIF_OPTIONS),
      isReadFromFirstBytes: true,
    },
    {
      format: "AVIF with EXIF data",
      create: () =>
        createNoise()
          .avif(AVIF_OPTIONS)
          .withMetadata({ orientation: ROTATED_ORIENTATION }),
      isReadFromFirstBytes: false,
    },
  ])(
    "gives the same displayed dimensions from the first bytes of a $format as from all bytes",
    async ({ create, isReadFromFirstBytes }) => {
      const image = await create().toBuffer();
      expect(image.length).toBeGreaterThan(FIRST_BYTES_LENGTH);

      const getAllBytes = vi.fn(() => Promise.resolve(new Uint8Array(image)));
      const fromFirstBytes = await readImageDimensions(
        image.subarray(0, FIRST_BYTES_LENGTH),
        getAllBytes,
      );

      expect(fromFirstBytes).toEqual({ width: 300, height: 400 });
      expect(fromFirstBytes).toEqual(await readImageDimensions(image));
      // Only the fast path is a promise; which other formats sharp can read
      // from a part of the file depends on its version
      if (isReadFromFirstBytes) expect(getAllBytes).not.toHaveBeenCalled();
    },
  );

  test("gives up when the full image is no longer available", async () => {
    const image = await createNoise().gif().toBuffer();

    await expect(
      readImageDimensions(image.subarray(0, FIRST_BYTES_LENGTH), () =>
        Promise.resolve(null),
      ),
    ).resolves.toBeNull();
  });
});
