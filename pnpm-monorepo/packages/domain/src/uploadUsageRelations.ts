import type { Prisma } from "@sam-monorepo/database/client";

/**
 * The rule of upload usage: an upload is in use while one of these
 * relations of the `Upload` model references it. The nightly cleanup
 * deletes each other upload (`UNUSED_UPLOAD_WHERE`), and the upload manager
 * of the app shows one usage type for each relation (`UploadUsageType`).
 *
 * The wiki relations are link tables that follow the content: the collab
 * server replaces the links of a page at each store, and each new snapshot
 * links the uploads of its content. Thus no check searches the content.
 *
 * `wikiReports` is the one deliberate omission: report evidence is meant to
 * expire with its upload, and the report keeps a `uploadFileName` snapshot.
 *
 * A relation that is in the model but not in this list silently deletes
 * uploads that are in use (as happened to `eventCovers`). Thus add each new
 * relation of the model here and to the usage types of the upload manager.
 */
export const UPLOAD_USAGE_RELATIONS = [
  "roleIcons",
  "roleThumbnails",
  "manufacturers",
  "eventCovers",
  "eventTemplateCovers",
  "wikiPageIcons",
  "wikiPageLinks",
  "wikiPageSnapshotLinks",
] as const satisfies readonly (keyof Prisma.UploadCountOutputTypeSelect)[];

export type UploadUsageRelation = (typeof UPLOAD_USAGE_RELATIONS)[number];

/**
 * Matches uploads no usage relation references. Both the cleanup's "may be
 * deleted" query and the upload manager's "Unbenutzt" filter are this.
 */
export const UNUSED_UPLOAD_WHERE: Prisma.UploadWhereInput = Object.fromEntries(
  UPLOAD_USAGE_RELATIONS.map((relation) => [relation, { none: {} }]),
);
