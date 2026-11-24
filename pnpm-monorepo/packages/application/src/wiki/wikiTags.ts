import type { Prisma } from "@sam-monorepo/database/client";
import {
  wikiContainerColumns,
  type EventContainer,
} from "@sam-monorepo/domain";
import { rethrowRecordNotFound } from "../errors.js";
import { WikiErrorMessage } from "./wikiErrors.js";

/**
 * The tag name is `citext`, thus names that differ only in letter case are one
 * tag: the letter case of an existing tag wins, and of new names that differ
 * only in letter case the first name wins. The insert skips a name that
 * exists, also when a parallel request created it. Runs on the transaction of
 * the caller, so a failed surrounding operation leaves no orphaned tags.
 *
 * @param container Null for the global wiki
 */
export const findOrCreateWikiTags = async (
  transaction: Prisma.TransactionClient,
  names: readonly string[],
  container: EventContainer | null,
  createdById: string | null,
): Promise<{ id: string; name: string }[]> => {
  if (names.length === 0) return [];

  const scopeColumns = wikiContainerColumns(container);

  /**
   * The same order of the names in each request prevents a deadlock between
   * two requests that insert the same new names. The sort is stable and
   * ignores letter case like `citext`, thus the first of two names that
   * differ only in letter case stays first.
   */
  await transaction.wikiTag.createMany({
    data: names
      .toSorted((first, second) =>
        first.toLowerCase().localeCompare(second.toLowerCase()),
      )
      .map((name) => ({ name, ...scopeColumns, createdById })),
    skipDuplicates: true,
  });

  /**
   * Prisma sends the names as parameters without a type. Thus PostgreSQL
   * compares them as `citext`, without letter case.
   */
  return transaction.wikiTag.findMany({
    where: { name: { in: [...names] }, ...scopeColumns },
    select: { id: true, name: true },
  });
};

/**
 * The copy of the tag names of a page for the full-text search (see
 * `WikiPage.tagsText`)
 */
export const toWikiPageTagsText = (names: readonly string[]) =>
  names.toSorted((first, second) => first.localeCompare(second)).join(" ");

interface WikiPageTags {
  readonly pageId: string;
  /** The complete set of tags. A tag that is not in it is removed. */
  readonly names: readonly string[];
  /** The scope of the tags: the container of the page, or null */
  readonly container: EventContainer | null;
  readonly createdById: string | null;
}

/**
 * A tag whose last assignment goes away here is deleted at once, thus the
 * autocomplete stays clean
 */
export const setWikiPageTags = async (
  transaction: Prisma.TransactionClient,
  { pageId, names, container, createdById }: WikiPageTags,
): Promise<{ readonly added: string[]; readonly removed: string[] }> => {
  const requestedTags = await findOrCreateWikiTags(
    transaction,
    names,
    container,
    createdById,
  );
  const currentAssignments = await transaction.wikiPageTag.findMany({
    where: { pageId },
    select: { id: true, tagId: true, tag: { select: { name: true } } },
  });

  const requestedTagIds = new Set(requestedTags.map((tag) => tag.id));
  const currentTagIds = new Set(
    currentAssignments.map((assignment) => assignment.tagId),
  );
  const removedAssignments = currentAssignments.filter(
    (assignment) => !requestedTagIds.has(assignment.tagId),
  );
  const addedTags = requestedTags.filter((tag) => !currentTagIds.has(tag.id));
  if (removedAssignments.length === 0 && addedTags.length === 0)
    return { added: [], removed: [] };

  await transaction.wikiPageTag.deleteMany({
    where: {
      id: { in: removedAssignments.map((assignment) => assignment.id) },
    },
  });
  await transaction.wikiPageTag.createMany({
    data: addedTags.map((tag) => ({ pageId, tagId: tag.id, createdById })),
    skipDuplicates: true,
  });
  /** After the delete of the assignments: else the tags are not orphans yet */
  await transaction.wikiTag.deleteMany({
    where: {
      id: { in: removedAssignments.map((assignment) => assignment.tagId) },
      pages: { none: {} },
    },
  });
  await rethrowRecordNotFound(
    () =>
      transaction.wikiPage.update({
        where: { id: pageId, deletedAt: null },
        data: {
          tagsText: toWikiPageTagsText(requestedTags.map((tag) => tag.name)),
          updatedById: createdById,
        },
        select: { id: true },
      }),
    WikiErrorMessage.PageNotFound,
  );

  return {
    added: addedTags.map((tag) => tag.name),
    removed: removedAssignments.map((assignment) => assignment.tag.name),
  };
};
