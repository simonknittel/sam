import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { cache } from "react";
import { UploadUsageType } from "../utils/uploadUsage";

const UPLOADS_PAGE_SIZE = 50;

/**
 * Ceiling for the multi-select filters, which arrive as freely editable URL
 * parameters. Far above the number of options either filter offers, but it
 * keeps a hand-written URL from turning into an unbounded `IN` list.
 */
const MAX_FILTER_VALUES = 100;

/** Longest file name search accepted; `Upload.fileName` itself caps at 255. */
const MAX_QUERY_LENGTH = 255;

/**
 * The usage relations of an upload, resolved into the labels and ids the
 * location links need (see `getUploadUsages`).
 */
const USAGE_SELECT = {
  roleIcons: { select: { id: true, name: true } },
  roleThumbnails: { select: { id: true, name: true } },
  manufacturers: { select: { id: true, name: true } },
  eventCovers: { select: { id: true, name: true } },
  wikiPageIcons: {
    select: { id: true, title: true, slug: true, eventId: true },
  },
  wikiPages: { select: { id: true, title: true, slug: true, eventId: true } },
} satisfies Prisma.UploadSelect;

/** Matches uploads which are not referenced anywhere (see UploadUsageType). */
const UNUSED_WHERE: Prisma.UploadWhereInput = {
  roleIcons: { none: {} },
  roleThumbnails: { none: {} },
  manufacturers: { none: {} },
  eventCovers: { none: {} },
  wikiPageIcons: { none: {} },
  wikiPages: { none: {} },
};

const getUsageWhere = (usage: UploadUsageType): Prisma.UploadWhereInput => {
  switch (usage) {
    case UploadUsageType.RoleIcon:
      return { roleIcons: { some: {} } };

    case UploadUsageType.RoleThumbnail:
      return { roleThumbnails: { some: {} } };

    case UploadUsageType.ManufacturerLogo:
      return { manufacturers: { some: {} } };

    case UploadUsageType.EventCover:
      return { eventCovers: { some: {} } };

    case UploadUsageType.WikiPageIcon:
      return { wikiPageIcons: { some: {} } };

    case UploadUsageType.WikiPageAttachment:
      return { wikiPages: { some: {} } };

    case UploadUsageType.Unused:
      return UNUSED_WHERE;

    default:
      throw new Error(`Unknown upload usage: ${usage satisfies never}`);
  }
};

/**
 * File names are stored URI-encoded, so a search for "Mein Bild" has to
 * reach "Mein%20Bild" as well. Both forms are matched: the encoded one for
 * the stored convention, the raw one for rows written before it and for
 * searches which happen to contain no encodable character.
 */
const getFileNameWhere = (query: string): Prisma.UploadWhereInput => ({
  OR: [
    { fileName: { contains: query, mode: "insensitive" } },
    {
      fileName: { contains: encodeURIComponent(query), mode: "insensitive" },
    },
  ],
});

/**
 * One page of uploads, newest first. Everyone sees their own uploads;
 * `upload;manage` widens the scope to all of them and adds the author, so
 * the permission changes what the page contains rather than whether it is
 * reachable at all.
 */
export const getUploads = cache(
  withTrace(
    "getUploads",
    async (
      usage?: UploadUsageType[] | null,
      from?: string | null,
      to?: string | null,
      query?: string | null,
      createdById?: string[] | null,
      cursor?: string | null,
      direction: CursorDirection = CursorDirection.Next,
    ) => {
      const authentication = await requireAuthentication();
      const canManage = await authentication.authorize("upload", "manage");

      const createdAt = getDateRangeFilter(from, to);
      const trimmedQuery = query?.trim().slice(0, MAX_QUERY_LENGTH);

      /**
       * Without the permission the scope is forced to the signed-in user,
       * which also makes a hand-written author filter pointless — it is only
       * applied for managers, so it can never widen anyone's view.
       */
      const authorWhere: Prisma.UploadWhereInput = canManage
        ? createdById && createdById.length > 0
          ? { createdById: { in: createdById.slice(0, MAX_FILTER_VALUES) } }
          : {}
        : { createdById: authentication.session.user.id };

      /**
       * File name search and usage filter each bring an `OR` of their own,
       * so they are combined through `AND` instead of being spread into one
       * object where the second would replace the first.
       */
      const conditions: Prisma.UploadWhereInput[] = [
        ...(trimmedQuery ? [getFileNameWhere(trimmedQuery)] : []),
        ...(usage && usage.length > 0
          ? [{ OR: usage.slice(0, MAX_FILTER_VALUES).map(getUsageWhere) }]
          : []),
      ];

      const where: Prisma.UploadWhereInput = {
        ...authorWhere,
        ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
        ...(conditions.length > 0 ? { AND: conditions } : {}),
      };

      const take =
        direction === CursorDirection.Prev
          ? -(UPLOADS_PAGE_SIZE + 1)
          : UPLOADS_PAGE_SIZE + 1;

      const rows = await prisma.upload.findMany({
        where,
        /**
         * `id` breaks ties so the order is total — uploads created in one
         * editing session share a `createdAt` down to the millisecond, and
         * the cursor can only pick a page boundary out of an order that has
         * exactly one.
         */
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take,
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          /**
           * Selected in both scopes although only the manager scope renders
           * it: without the permission every row belongs to the signed-in
           * user anyway, so there is nothing here they could not see.
           */
          createdBy: { select: { id: true, name: true } },
          ...USAGE_SELECT,
        },
      });

      const hasMore = rows.length > UPLOADS_PAGE_SIZE;

      let uploads;
      if (hasMore) {
        uploads =
          direction === CursorDirection.Prev
            ? rows.slice(1)
            : rows.slice(0, UPLOADS_PAGE_SIZE);
      } else {
        uploads = rows;
      }

      const hasNextPage =
        direction === CursorDirection.Next ? hasMore : !!cursor;
      const hasPrevPage =
        direction === CursorDirection.Prev ? hasMore : !!cursor;

      return {
        uploads,
        canManage,
        nextCursor:
          hasNextPage && uploads.length > 0
            ? uploads[uploads.length - 1].id
            : null,
        prevCursor: hasPrevPage && uploads.length > 0 ? uploads[0].id : null,
      };
    },
  ),
);
