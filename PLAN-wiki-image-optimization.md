# Wiki image optimization

## Goal

Serve wiki content images through Next.js' built-in image optimizer instead of delivering the original uploads at full size. To make this possible, store each image upload's intrinsic width and height on the `Upload` row (probed server-side after upload), render wiki images in the static read view with `next/image`, and backfill dimensions for all existing image uploads.

## Decision log

- **Dimensions live on the `Upload` row** (nullable `width`/`height` columns), not in Tiptap node attrs. The Yjs `ydoc` is the source of truth for page content — backfilling node attrs would mean rewriting every ydoc through the collab server, and old snapshots would stay dimension-less. A DB column keeps the backfill a plain row update and automatically covers snapshots, duplicated pages and the dashboard tile.
- **Scope: all image uploads get dimensions** (wiki images, page icons, role icons, manufacturer images — they share `Upload` and the same upload routes), but **only the wiki static renderer switches to `next/image`** for now. Other consumers can adopt the columns later without a second backfill.
- **The collab editor keeps its plain `<img>`.** Optimization benefits readers (the vast majority); a React node view for the image node would have to coexist with `WikiResizeHandles`, drag and alignment — not worth the risk now.
- **Dimensions are probed server-side** (not measured client-side at upload): trustworthy values and the same code path shape as the backfill. The probe runs on `PATCH /api/upload/assign` inside Next's `after()`, so the upload UX pays no latency. If the probe fails, dimensions stay `NULL` and rendering falls back to today's plain `<img>`.
- **Images get a 25 MB upload cap** (shared value with `MAX_ATTACHMENT_SIZE_BYTES`), enforced in the image branch of `POST /api/upload` plus client-side checks. The same threshold guards the probe and the backfill so a huge object is never buffered. Existing larger uploads stay untouched — they keep `NULL` dimensions and render as today.
- **SVG and GIF render unoptimized** (matching the existing pattern in `ImageUpload.tsx` / `WikiPageIcon.tsx`), but still get width/height for layout stability where determinable.
- **The static renderer resolves dimensions by collecting upload ids from the content JSON** (src URLs ending in the upload id) rather than relying on the `Upload.wikiPages` link table — this also covers images copied from another page before the nightly reconciliation links them.
- **The backfill fetches objects via the public R2 URL**, so the script needs no S3 credentials — only `DATABASE_URL` and the public hostname.
- The probe also **corrects `Upload.size`** with the object's actual `ContentLength`, since the client-stated value is unverified.
- No changelog entry.

### Out of scope

- Optimized images in the collab editor (edit mode keeps the stock `<img>` rendering).
- Switching `WikiPageIcon`, `ImageUpload`, role/manufacturer renderers to real dimensions or optimization.
- Icons inside page-link chips and variant-link chips (raw `<img>` in `renderHTML`).
- Moving the R2 bucket behind a custom domain / Cloudflare image transformations (the `*.r2.dev` host rules those out today).
- Retroactively shrinking or re-encoding stored originals.

## Overall implementation notes

- **Upload flow recap:** `POST /api/upload` creates the `Upload` row and returns a presigned PUT URL (the server never sees the bytes), the client PUTs to R2, then `PATCH /api/upload/assign` links the upload to its resource. The assign step is the one place the server knows the object exists — that's where the probe hooks in.
- **Probe mechanics:** `GetObjectCommand` via the existing S3 client, abort if `ContentLength` exceeds the cap, buffer, `sharp` (already an app dependency) `metadata()`, swap width/height for EXIF orientations 5–8 (browsers apply `image-orientation: from-image`, so stored dimensions must be the displayed ones), bounded-int validation, `prisma.upload.update`. Everything wrapped so a failure only logs (no PII — upload id only) and leaves `NULL`s.
- **Rendering:** `WikiPageStaticContent.tsx` gets an `image` entry in its `nodeMapping` (the same pattern as `wikiAttachment`). For srcs on `https://${NEXT_PUBLIC_S3_PUBLIC_URL}/<uploadId>` with known dimensions it renders `next/image`; anything else (external src, unknown dims, probe failures) falls back to the exact `<img>` produced today. The `width`/`height` props carry the *intrinsic* dimensions (correct aspect-ratio box, identical layout semantics to a plain img with size attributes); the `sizes` attribute caps what the optimizer serves at the *display* width — `min(100vw, <widthPx ?? intrinsic width>px)`, `100vw` for explicit full width — so with `sizes` present Next.js emits the full device-size srcset and the browser picks a sanely sized candidate. `widthPx`/`align` keep rendering as inline styles exactly as the stock `renderHTML` does, and `.prose img` CSS still applies since `next/image` emits an `<img>`.
- **Layout stability:** with width/height set the browser reserves the aspect-ratio box before the image loads — image-heavy pages stop shifting during load. This must hold from SSR (no client-side measurement).
- **No collab redeploy needed:** the wiki-editor schema is untouched (the stock Image node's `width`/`height` attrs already exist and stay unused).
- **The optimizer setup already exists:** the R2 host is allowlisted in `next.config.ts` `images.remotePatterns`, `minimumCacheTTL` is 30 days, `sharp` is installed. Vercel bills image transformations; the 30-day cache and the fact that wiki traffic is internal keep that bounded, and optimizer caching *reduces* hits on the rate-limited `*.r2.dev` host.
- **Deploy order:** app release first (migration adds nullable columns — safe), then run the backfill script against production. No coordination with the collab server.

## Implementation phases

### Phase 1: Dimensions on the Upload model

Add nullable `width`/`height` integer columns to `Upload`, following the precedent of the nullable `size` column ("NULL for uploads created before this column existed").

#### Status

Done (2026-08-08). Migration `20260808055044_upload_dimensions` created and applied to the dev DB; Prisma client regenerated.

#### Steps

- Add the two columns with doc comments to the `Upload` model in the database package.
- Generate the migration with `pnpm run migrate:dev` (dev DB must be running) — never hand-write `migration.sql`.
- Regenerate the Prisma client.

#### Notes

- Columns are optional at runtime everywhere — every consumer must treat `NULL` as "unknown, fall back".

#### Verification

- Migration applies cleanly to the dev database; `prisma generate` output exposes `width`/`height` on the `Upload` type.

### Phase 2: Image upload size cap

Give images the same 25 MB cap attachments already have, so the probe (and the serverless function memory) has a hard bound.

#### Status

Done (2026-08-08). `MAX_IMAGE_SIZE_BYTES` in `uploadConstraints.ts`; `size` now required + capped in the image branch of `POST /api/upload`; client checks in `uploadWikiPageFile` (throw, toast'ed by callers) and `useUpload` (toast).

#### Steps

- Introduce a shared max-image-size constant next to `MAX_ATTACHMENT_SIZE_BYTES`.
- In the image branch of the `POST /api/upload` body schema, make `size` required and cap it.
- Mirror the check client-side where uploads start (wiki file helper and the generic upload hook) so users get an immediate error instead of a rejected request.

#### Notes

- The presigned PUT itself still enforces nothing — the authoritative check against lying clients is the probe-side `ContentLength` guard (Phase 3).
- `size` becoming required is safe: both client paths already send it.
- Client-side pattern imitated from the existing attachment cap in `uploadWikiPageFile` (toast + abort).

#### Verification

- Uploading an image > 25 MB fails with a clear client-side error; ≤ 25 MB uploads work unchanged; attachments unaffected.

### Phase 3: Server-side dimension probe

After a successful assign, probe the object in R2 and persist its dimensions without delaying the response.

#### Status

Done (2026-08-08). `probeUploadImageDimensions.ts` (mirrors the `trackWikiPageVisit` after()+log pattern); called on all three assign success paths (wiki page content, wiki page icon, manufacturer/role). HEAD guard before GET; EXIF orientation swap; corrects `size` with the real `ContentLength`.

#### Steps

- Extract a small probe utility (S3 `GetObject`, `ContentLength` guard, `sharp` metadata, EXIF orientation normalization, bounded-int validation).
- Call it from the assign route inside `after()` for uploads with an `image/*` mime type that don't have dimensions yet.
- Update the `Upload` row with width, height and the object's actual size; on any failure, log the upload id and leave the row unchanged.

#### Notes

- `after()` is supported on Vercel and runs once the response is sent; a probe failure is invisible to the user by design.
- SVG dimensions come from the viewBox where present; `sharp` reports them. Indeterminate SVGs simply keep `NULL`.
- Re-assign of an already-probed upload skips the probe (width already set).
- sharp is listed in `serverExternalPackages` by Next.js by default — no config change needed.

#### Verification

- Upload an image in the dev app; the `Upload` row gains correct width/height within a moment of the assign call.
- Upload a rotated-EXIF JPEG; stored dimensions match the displayed orientation.
- An oversized object (or a deleted object) leaves dimensions `NULL` without a visible error.

### Phase 4: Optimized rendering in the static read view

Render wiki content images with `next/image` wherever dimensions are known; keep today's `<img>` as the fallback.

#### Status

Done (2026-08-08). New `WikiContentImage` component + `image` nodeMapping; `collectWikiImageUploadIds`/`getWikiImageUploadId` in the wiki-editor package (exported, but not used by the collab server — no redeploy needed); `imageDimensions` map threaded through `getWikiPageStaticContent`.

#### Steps

- Collect referenced image upload ids while preparing the static content (walk the content JSON for image srcs on the public R2 host) and fetch their dimensions in the existing query.
- Add an `image` entry to the static renderer's `nodeMapping`: known dimensions → `next/image` with display-width-based `width`/`height`/`sizes`, `widthPx`/`align` styles preserved, SVG/GIF unoptimized; unknown → the exact fallback `<img>` Tiptap renders today.
- Keep the alt/title attrs and `.prose img` styling identical in both branches.

#### Notes

- `width`/`height` props are the intrinsic dimensions; `sizes` = `min(100vw, <display width>px)` bounds the fetched variant. No content-column constant needed — the viewport bound plus `max-width: 100%` cover it.
- Images now load lazily (`next/image` default) where the previous plain imgs were eager — accepted; below-fold images on image-heavy pages stop loading upfront.
- The dashboard page tile reuses the same query + renderer and needs no separate change (tile passes `wikiPageIndexPages: null` etc. — dimension map piggybacks on the same object).
- Images in *snapshots* render through the same static renderer when previewing — the dimension map comes from the same Upload rows, so they're covered.
- Implementation detail: a `Map<uploadId, {width, height, mimeType}>` threaded alongside the existing resolution maps; note the rendered tree is also passed as `staticFallback` prop into the client editor, so the `next/image` element must be RSC-serializable (it is — but verify in the running app).

#### Verification

- A wiki page with images serves `/_next/image?url=…` URLs in the read view, with `width`/`height` set and no layout shift while loading (hard-reload with cold cache).
- An image with a `widthPx` resize and/or alignment renders at the same visual size/position as before.
- An SVG and a GIF render via their original URLs (unoptimized) but still reserve layout space when dimensions are known.
- A dimension-less image (NULL columns) renders exactly as today.
- The collab editor (edit mode) is unchanged.

### Phase 5: Backfill script

Populate dimensions for every existing image upload.

#### Status

Done (2026-08-08). `apps/scripts/src/migrations/012-backfill-upload-dimensions.ts`; run against the dev DB: 467 of 493 image uploads backfilled, 26 skipped (objects missing from the dev bucket — the known dev-bucket 404s). **Production run still pending after the release.**

#### Steps

- New script following the numbered convention in the scripts app: select `Upload` rows with an `image/*` mime type and `NULL` width, fetch each object from the public R2 URL with a timeout and the 25 MB guard (checked via `Content-Length` header before buffering), probe dimensions with the same normalization as Phase 3, update the row.
- Bounded concurrency, progress logging, per-row error collection with a summary at the end; skipped/failed rows keep `NULL` and are safe to re-run (idempotent by the `NULL width` filter).

#### Notes

- Needs `DATABASE_URL` (via the database package, as the existing migration scripts do) and `NEXT_PUBLIC_S3_PUBLIC_URL` as env when run.
- Add `sharp` to `apps/scripts` (pinned to the same version as the app) so probe results are identical to the runtime path.
- Objects that are gone from the bucket (orphans within the cleanup grace period) fail fetch → logged, skipped.
- Run: `NEXT_PUBLIC_S3_PUBLIC_URL=… pnpm exec tsx src/migrations/012-backfill-upload-dimensions.ts` in `apps/scripts` (DATABASE_URL comes from `packages/database/.env`).

#### Verification

- Run against the dev database: all fetchable image uploads gain plausible dimensions; the summary lists any skipped rows with reasons; re-running is a no-op.

## Final end-to-end verification

Verified 2026-08-08 in the worktree against the main dev stack (dev server on port 3001):

- Typecheck (`tsc --noEmit`), targeted ESLint on all changed files, and the full app vitest suite (24 files, 246 tests) pass. New unit tests cover `getWikiImageUploadId`/`collectWikiImageUploadIds`.
- Upload flow via the live API: `POST /api/upload` with a 30 MB image declaration → 400; a valid upload (123×45 PNG) → presigned PUT → assign → the `after()` probe filled `width=123, height=45` and corrected `size` within seconds, without delaying the assign response.
- Static read view (collab stopped so the static render stays visible; the viewer was an editor): uploaded image renders via `/_next/image` with full srcset, `width`/`height` attributes and `sizes`; rendered boxes exactly 500×200 (natural) and 300×120 (widthPx 300, right-aligned — margins correct, aspect ratio preserved); optimizer served 10.9 KB WebP for the 80.6 KB PNG original. External-src image fell back to the plain `<img>` with no srcset. `data-width-px`/`data-align` preserved for lossless copy/paste.
- Edit mode (collab editor) untouched — still renders the stock plain `<img>`.
- Backfill run against the dev DB (see Phase 5).
- Not exercised in-app: the client-side toast for an oversized image pick (code path mirrors the existing attachment cap), SVG/GIF unoptimized rendering in wiki content (pattern verified via DB dimensions on SVG uploads + the shared opt-out list), and a rotated-EXIF JPEG upload.
- After production release: run the backfill against production (`NEXT_PUBLIC_S3_PUBLIC_URL=<prod host>` + prod `DATABASE_URL`), then spot-check an image-heavy wiki page for optimized URLs and absence of layout shift.
