import { prisma } from "@sam-monorepo/database";
import sharp from "sharp";

/**
 * Backfills `Upload.width`/`Upload.height` for image uploads created before
 * the dimension probe existed. Fetches each object via the public bucket
 * URL (no S3 credentials needed) and probes it exactly like
 * `probeUploadImageDimensions` in the app.
 *
 * Usage:
 *   S3_PUBLIC_URL=<public bucket host> \
 *     pnpm exec tsx src/migrations/012-backfill-upload-dimensions.ts
 *
 * Idempotent: only rows with a NULL width are touched, so failed rows can
 * be retried by simply re-running.
 */

const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION_PX = 100_000;
const CONCURRENCY = 5;
const FETCH_TIMEOUT_MS = 30_000;
const PROGRESS_LOG_INTERVAL = 25;

const publicUrlHost = process.env.S3_PUBLIC_URL;
if (!publicUrlHost) throw new Error("S3_PUBLIC_URL is not set");

const isPlausibleDimension = (value: number | undefined): value is number =>
  value !== undefined &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= MAX_DIMENSION_PX;

/**
 * EXIF orientations 5-8 rotate the image by 90°. Browsers apply the
 * rotation when displaying, so the persisted dimensions must be the
 * displayed ones, not the stored ones.
 */
const swapsDimensions = (orientation: number | undefined) =>
  orientation !== undefined && orientation >= 5;

const skipped: { uploadId: string; reason: string }[] = [];
let backfilled = 0;

async function backfillUpload(uploadId: string) {
  const response = await fetch(
    new URL(`https://${publicUrlHost}/${uploadId}`),
    { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (!response.ok) {
    skipped.push({ uploadId, reason: `fetch failed (${response.status})` });
    return;
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader === null) {
    skipped.push({ uploadId, reason: "unknown content length" });
    return;
  }
  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength > MAX_IMAGE_SIZE_BYTES) {
    skipped.push({
      uploadId,
      reason: `oversized or unknown content length (${contentLengthHeader})`,
    });
    return;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  const width = swapsDimensions(metadata.orientation)
    ? metadata.height
    : metadata.width;
  const height = swapsDimensions(metadata.orientation)
    ? metadata.width
    : metadata.height;
  if (!isPlausibleDimension(width) || !isPlausibleDimension(height)) {
    skipped.push({
      uploadId,
      reason: `implausible dimensions (${width}x${height})`,
    });
    return;
  }

  await prisma.upload.update({
    where: { id: uploadId },
    // The buffered length is authoritative; the header is only trusted as
    // an upper bound before buffering
    data: { width, height, size: bytes.byteLength },
  });
  backfilled += 1;
}

async function main() {
  const uploads = await prisma.upload.findMany({
    where: { mimeType: { startsWith: "image/" }, width: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${uploads.length} image uploads without dimensions`);

  const queue = uploads.map((upload) => upload.id);
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const uploadId = queue.shift();
        if (!uploadId) return;
        try {
          await backfillUpload(uploadId);
        } catch (error) {
          skipped.push({ uploadId, reason: String(error) });
        }
        const processed = backfilled + skipped.length;
        if (processed % PROGRESS_LOG_INTERVAL === 0)
          console.log(`${processed}/${uploads.length} processed`);
      }
    }),
  );

  console.log(`Backfilled ${backfilled}, skipped ${skipped.length}`);
  for (const entry of skipped)
    console.log(`  skipped ${entry.uploadId}: ${entry.reason}`);
}

await main();
