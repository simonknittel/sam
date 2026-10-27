"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPanel } from "@/modules/common/components/ItemPicker/ItemPickerPanel";
import { searchItems } from "@/modules/common/components/ItemPicker/searchItems";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { useState } from "react";

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

  const search = searchItems(tags, query);

  return (
    <ItemPickerPanel
      mode={ItemPickerMode.Multiple}
      label="Tags"
      searchPlaceholder="Tag suchen …"
      query={query}
      onQueryChange={setQuery}
      items={tags
        .filter((tag) => search.isListed(tag.id))
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          nameContent: search.getNameContent(tag),
          icon: tag.icon && (
            <UploadedIcon upload={tag.icon} size={UploadedIconSize.Medium} />
          ),
        }))}
      bestMatchId={search.matchedIds[0]}
      selectedIds={selectedTagIds}
      onSelect={onTagClick}
      emptyText="Kein Tag gefunden"
    />
  );
};
