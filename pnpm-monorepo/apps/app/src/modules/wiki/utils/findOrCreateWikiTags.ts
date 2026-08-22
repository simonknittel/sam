import {
  wikiContainerColumns,
  type EventContainer,
} from "@/modules/events/utils/eventContainer";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * Case-insensitive find-or-create per tag name within one scope (like
 * updateWikiPageTags): the display casing of an existing tag wins over the
 * submitted one, and names differing only in casing collapse onto the first
 * submitted one. Runs on the caller's transaction so a failed surrounding
 * operation leaves no orphaned tags. Returns the tags keyed by lower-cased
 * name.
 */
export const findOrCreateWikiTags = async (
  transaction: Prisma.TransactionClient,
  names: readonly string[],
  container: EventContainer | null,
  createdById: string | null,
): Promise<Map<string, { id: string; name: string }>> => {
  const uniqueNamesByLower = new Map<string, string>();
  for (const name of names) {
    const lower = name.toLocaleLowerCase();
    if (!uniqueNamesByLower.has(lower)) uniqueNamesByLower.set(lower, name);
  }

  const scopeColumns = wikiContainerColumns(container);

  const tagsByLower = new Map<string, { id: string; name: string }>();
  for (const [lower, name] of uniqueNamesByLower) {
    const existing = await transaction.wikiTag.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...scopeColumns,
      },
      select: { id: true, name: true },
    });
    tagsByLower.set(
      lower,
      existing ??
        (await transaction.wikiTag.create({
          data: { name, ...scopeColumns, createdById },
          select: { id: true, name: true },
        })),
    );
  }

  return tagsByLower;
};
