import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Every usage relation of the `Upload` model — the single list the nightly
 * cleanup and the upload manager both read.
 *
 * It used to be spelled out in three places, and a relation added to the
 * model but forgotten in one of them silently deleted uploads that were in
 * use (as happened to `eventCovers`). Adding a relation to the model means
 * adding it here, and the compiler then points at every consumer.
 *
 * `wikiReports` is the one deliberate omission: report evidence is meant to
 * expire with its upload, and the report keeps a `uploadFileName` snapshot.
 */
export const UPLOAD_USAGE_RELATIONS = [
  "roleIcons",
  "roleThumbnails",
  "manufacturers",
  "eventCovers",
  "eventTemplateCovers",
  "wikiPageIcons",
  "wikiPages",
] as const satisfies readonly (keyof Prisma.UploadCountOutputTypeSelect)[];

export type UploadUsageRelation = (typeof UPLOAD_USAGE_RELATIONS)[number];

/**
 * Matches uploads no usage relation references. Both the cleanup's "may be
 * deleted" query and the upload manager's "Unbenutzt" filter are this.
 */
export const UNUSED_UPLOAD_WHERE: Prisma.UploadWhereInput = Object.fromEntries(
  UPLOAD_USAGE_RELATIONS.map((relation) => [relation, { none: {} }]),
);
