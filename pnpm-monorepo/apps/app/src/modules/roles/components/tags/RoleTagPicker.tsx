"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { useState } from "react";
import { FaTags } from "react-icons/fa";
import { useRolesContext } from "../RolesContext";
import { RoleTagPanel } from "./RoleTagPanel";
import { RoleTagPickerChip } from "./RoleTagPickerChip";

interface Props {
  readonly className?: string;
  /** The form field name of the hidden input of each selected tag */
  readonly name: string;
  readonly defaultValue: readonly BadgeRoleTag["id"][];
}

/**
 * Offers the tags of the roles context in a popover, with the look of the
 * role picker in multiple mode: a click on a tag selects or deselects it,
 * and the selected tags show under the trigger. A selected tag that is not
 * in the roles context stays selected and is submitted.
 */
export const RoleTagPicker = ({ className, name, defaultValue }: Props) => {
  const { tags } = useRolesContext();
  const [selectedTagIds, setSelectedTagIds] = useState(defaultValue);

  const removeTag = (tagId: BadgeRoleTag["id"]) => {
    setSelectedTagIds((previous) =>
      previous.filter((selectedTagId) => selectedTagId !== tagId),
    );
  };

  const toggleTag = (tagId: BadgeRoleTag["id"]) => {
    if (selectedTagIds.includes(tagId)) {
      removeTag(tagId);
    } else {
      setSelectedTagIds((previous) => [...previous, tagId]);
    }
  };

  /** The context gives the tags sorted by name */
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className={className}>
      <ItemPickerPopover
        title="Tag auswählen"
        trigger={
          <>
            <FaTags /> Tag auswählen
          </>
        }
        triggerRender={
          <Button2
            type="button"
            title="Tag auswählen"
            variant={Button2Variant.Secondary}
            className="flex-none"
          />
        }
      >
        <RoleTagPanel
          tags={tags}
          selectedTagIds={selectedTagIds}
          onTagClick={toggleTag}
        />
      </ItemPickerPopover>

      {selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <RoleTagPickerChip key={tag.id} tag={tag} onRemove={removeTag} />
          ))}
        </div>
      )}

      {selectedTagIds.map((tagId) => (
        <input key={tagId} type="hidden" name={name} value={tagId} />
      ))}
    </div>
  );
};
