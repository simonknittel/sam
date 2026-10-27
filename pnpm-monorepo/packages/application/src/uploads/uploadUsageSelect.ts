import type { Prisma } from "@sam-monorepo/database/client";

const UPLOAD_USAGE_WIKI_PAGE_SELECT = {
  id: true,
  title: true,
  slug: true,
  eventId: true,
  templateId: true,
} satisfies Prisma.WikiPageSelect;

/**
 * The usage relations of an upload, with the names and the ids that the
 * locations need (see `listUploadUsages()` of the domain package)
 */
export const UPLOAD_USAGE_SELECT = {
  roleIcons: { select: { id: true, name: true } },
  roleThumbnails: { select: { id: true, name: true } },
  roleTagIcons: { select: { id: true, name: true } },
  manufacturers: { select: { id: true, name: true } },
  eventCovers: { select: { id: true, name: true } },
  eventTemplateCovers: { select: { id: true, name: true } },
  wikiPageIcons: { select: UPLOAD_USAGE_WIKI_PAGE_SELECT },
  /** A page that uses the upload as an image and as an attachment is one usage */
  wikiPageLinks: {
    distinct: ["pageId"],
    select: { page: { select: UPLOAD_USAGE_WIKI_PAGE_SELECT } },
  },
  wikiPageSnapshotLinks: {
    select: {
      snapshot: { select: { page: { select: UPLOAD_USAGE_WIKI_PAGE_SELECT } } },
    },
  },
} satisfies Prisma.UploadSelect;
