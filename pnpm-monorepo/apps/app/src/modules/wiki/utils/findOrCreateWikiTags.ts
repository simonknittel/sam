import {
  wikiContainerColumns,
  type EventContainer,
} from "@/modules/events/utils/eventContainer";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Finds the tags of the given names in one scope and creates the missing
 * ones in one insert. The tag name is `citext`, thus names that differ only
 * in letter case are one tag: the letter case of an existing tag wins, and
 * of new names that differ only in letter case the first name wins. The
 * insert skips a name that exists, also when a parallel request created it.
 * Runs on the transaction of the caller, so a failed surrounding operation
 * leaves no orphaned tags. Returns each tag one time.
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
