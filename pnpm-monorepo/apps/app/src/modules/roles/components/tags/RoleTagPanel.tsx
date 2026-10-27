"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPanel } from "@/modules/common/components/ItemPicker/ItemPickerPanel";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import Fuse from "fuse.js";
import { useState } from "react";
import { UploadedIcon, UploadedIconSize } from "@/modules/common/components/UploadedIcon";

/** The same value as the search of the role picker (see `RolePanel`) */
const SEARCH_THRESHOLD = 0.2;

/**
 * Searches the tag names. Gives the ids of the matched tags, each with the
 * character ranges of the match.
 */
const search = (tags: readonly BadgeRoleTag[], query: string) => {
  const fuse = new Fuse(tags, {
    keys: ["name"],
    includeMatches: true,
    threshold: SEARCH_THRESHOLD,
  });

  return new Map(
    fuse
      .search(query)
      .map((result) => [result.item.id, result.matches?.[0]?.indices]),
  );
};

interface Props {
  /** Sorted by name */
  readonly tags: readonly BadgeRoleTag[];
  readonly selectedTagIds: readonly BadgeRoleTag["id"][];
  readonly onTagClick: (tagId: BadgeRoleTag["id"]) => void;
}

/**
 * The content of the tag picker: a search over the tag names and one tag per
 * row. Like the role picker, but without the tag row. The owner holds the
 * selection.
 */
export const RoleTagPanel = ({ tags, selectedTagIds, onTagClick }: Props) => {
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const matches = trimmedQuery ? search(tags, trimmedQuery) : null;

  return (
    <ItemPickerPanel
      mode={ItemPickerMode.Multiple}
      label="Tags"
      searchPlaceholder="Tag suchen …"
      query={query}
      onQueryChange={setQuery}
      items={tags
        .filter((tag) => !matches || matches.has(tag.id))
        .map((tag) => {
          const nameMatch = matches?.get(tag.id);

          return {
            id: tag.id,
            name: tag.name,
            nameContent: nameMatch
              ? underlineCharacters(tag.name, nameMatch)
              : undefined,
            icon: tag.icon && (
              <UploadedIcon upload={tag.icon} size={UploadedIconSize.Medium} />
            ),
          };
        })}
      selectedIds={selectedTagIds}
      onSelect={onTagClick}
      emptyText="Kein Tag gefunden"
    />
  );
};
