import type { Prisma } from "@sam-monorepo/database/client";
import {
  UNUSED_UPLOAD_WHERE,
  UPLOAD_USAGE_RELATION_BY_TYPE,
  UploadUsageType,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { paginateByDatabaseCursor, type PageOptions } from "../pagination.js";
import { MAXIMUM_UPLOAD_FILE_NAME_LENGTH } from "./createUpload.js";
import { UPLOAD_USAGE_SELECT } from "./uploadUsageSelect.js";

/**
 * The uploads of one page of the uploads table. Each row also loads its
 * usages, thus a page is smaller than a page of a list without relations.
 */
const UPLOAD_TABLE_PAGE_SIZE = 50;

/**
 * The limit of the multi-select filters. They come from parameters of the
 * URL that a user can change. The limit is much higher than the number of
 * options of each filter, but a written URL cannot make an `IN` list of any
 * length.
 */
const MAXIMUM_UPLOAD_FILTER_VALUES = 100;

/** A longer search cannot match a stored file name */
const MAXIMUM_UPLOAD_QUERY_LENGTH = MAXIMUM_UPLOAD_FILE_NAME_LENGTH;

const UPLOAD_TABLE_SELECT = {
  id: true,
  fileName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  /**
   * Selected in both scopes, but only the scope of the managers shows it:
   * without the permission, each row belongs to the actor
   */
  createdBy: { select: CITIZEN_REFERENCE_SELECT },
  ...UPLOAD_USAGE_SELECT,
} satisfies Prisma.UploadSelect;

export type UploadTableRow = Prisma.UploadGetPayload<{
  select: typeof UPLOAD_TABLE_SELECT;
}>;

export interface UploadTablePageInput {
  readonly usage?: readonly UploadUsageType[] | null;
  /** The first instant of the creation, inclusive */
  readonly from?: Date;
  /** The end of the creation, exclusive */
  readonly to?: Date;
  /** A part of the file name */
  readonly query?: string | null;
  /** Only the managers can filter by them */
  readonly createdByIds?: readonly string[] | null;
  readonly cursor?: string | null;
}

export interface UploadTablePage {
  readonly uploads: UploadTableRow[];
  readonly canManage: boolean;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

const getUsageWhere = (usage: UploadUsageType): Prisma.UploadWhereInput =>
  usage === UploadUsageType.Unused
    ? UNUSED_UPLOAD_WHERE
    : { [UPLOAD_USAGE_RELATION_BY_TYPE[usage]]: { some: {} } };

/**
 * The file names are stored URI-encoded, thus a search for "Mein Bild" must
 * also find "Mein%20Bild". The condition matches both forms: some rows hold
 * the raw form.
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
 * Without the permission, the scope is the citizen of the actor, and the
 * author filter does not apply: it applies only for the managers, thus it
 * can never show more to a user. Null when the actor can see no upload: the
 * author of an upload is a citizen, and the actor has none.
 */
const getAuthorWhere = (
  canManage: boolean,
  createdByIds: readonly string[] | null | undefined,
  citizenId: string | undefined,
): Prisma.UploadWhereInput | null => {
  if (canManage)
    return createdByIds && createdByIds.length > 0
      ? {
          createdById: {
            in: createdByIds.slice(0, MAXIMUM_UPLOAD_FILTER_VALUES),
          },
        }
      : {};

  return citizenId ? { createdById: citizenId } : null;
};

const buildWhere = (
  { usage, from, to, query }: UploadTablePageInput,
  authorWhere: Prisma.UploadWhereInput,
): Prisma.UploadWhereInput => {
  const trimmedQuery = query?.trim().slice(0, MAXIMUM_UPLOAD_QUERY_LENGTH);

  /**
   * The search and the usage filter each have an `OR`. Thus they go into an
   * `AND`: in one object, the second `OR` would replace the first.
   */
  const conditions: Prisma.UploadWhereInput[] = [
    ...(trimmedQuery ? [getFileNameWhere(trimmedQuery)] : []),
    ...(usage && usage.length > 0
      ? [
          {
            OR: usage.slice(0, MAXIMUM_UPLOAD_FILTER_VALUES).map(getUsageWhere),
          },
        ]
      : []),
  ];

  return {
    ...authorWhere,
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
    ...(conditions.length > 0 ? { AND: conditions } : {}),
  };
};

/**
 * Each actor sees the own uploads. `upload;manage` shows the uploads of all
 * citizens with their authors: the permission changes the content of the page,
 * not the access to it.
 */
export const findUploadTablePage = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  input: UploadTablePageInput,
  { direction, unknownCursor }: PageOptions = {},
): Promise<UploadTablePage> => {
  const canManage = actor.authorize("upload", "manage");

  const authorWhere = getAuthorWhere(
    canManage,
    input.createdByIds,
    actor.citizen?.id,
  );
  if (!authorWhere)
    return { uploads: [], canManage, nextCursor: null, prevCursor: null };

  const where = buildWhere(input, authorWhere);

  const page = await paginateByDatabaseCursor(
    {
      cursor: input.cursor,
      pageSize: UPLOAD_TABLE_PAGE_SIZE,
      direction,
      unknownCursor,
    },
    (cursorArguments) =>
      context.prisma.upload.findMany({
        where,
        /**
         * `id` makes the order total: the uploads of one editing session can
         * have the same `createdAt` to the millisecond, and a cursor needs an
         * order with exactly one page boundary
         */
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: UPLOAD_TABLE_SELECT,
        ...cursorArguments,
      }),
    async (id) => (await context.prisma.upload.count({ where: { id } })) > 0,
  );

  return {
    uploads: page.items,
    canManage,
    nextCursor: page.nextCursor,
    prevCursor: page.previousCursor,
  };
};
