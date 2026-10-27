import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import Fuse from "fuse.js";
import type { ReactNode } from "react";
import type { ItemPickerItem } from "./ItemPickerOption";

/**
 * 0 finds only exact matches, 1 finds everything. 0.2 permits small typing
 * errors.
 */
const SEARCH_THRESHOLD = 0.2;

type SearchEntry = Pick<ItemPickerItem, "id" | "name">;

export interface ItemSearchResult {
  /**
   * The ids of the matched entries, from the best to the worst match. Empty
   * without a query.
   */
  readonly matchedIds: readonly ItemPickerItem["id"][];
  /** Whether the list shows the entry. Without a query, it shows all entries. */
  readonly isListed: (id: ItemPickerItem["id"]) => boolean;
  /**
   * The `nameContent` of the item: the name with the underlined characters
   * of the match. Undefined when the name does not match.
   */
  readonly getNameContent: (entry: SearchEntry) => ReactNode;
}

/**
 * The fuzzy search of a picker. It searches the name and the other `keys` of
 * the entries, for example the tag names of a role.
 */
export const searchItems = <Entry extends SearchEntry>(
  entries: readonly Entry[],
  query: string,
  keys: readonly (keyof Entry & string)[] = ["name"],
): ItemSearchResult => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery)
    return {
      matchedIds: [],
      isListed: () => true,
      getNameContent: () => undefined,
    };

  const fuse = new Fuse(entries, {
    keys: [...keys],
    includeMatches: true,
    threshold: SEARCH_THRESHOLD,
  });
  const nameMatchById = new Map(
    fuse
      .search(trimmedQuery)
      .map((result) => [
        result.item.id,
        result.matches?.find((match) => match.key === "name")?.indices,
      ]),
  );

  return {
    matchedIds: [...nameMatchById.keys()],
    isListed: (id) => nameMatchById.has(id),
    getNameContent: (entry) => {
      const nameMatch = nameMatchById.get(entry.id);
      return nameMatch ? underlineCharacters(entry.name, nameMatch) : undefined;
    },
  };
};
