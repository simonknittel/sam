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
  /** From the best to the worst match. Empty without a query. */
  readonly matchedIds: readonly ItemPickerItem["id"][];
  readonly isListed: (id: ItemPickerItem["id"]) => boolean;
  /** Undefined when the name does not match */
  readonly getNameContent: (entry: SearchEntry) => ReactNode;
}

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
