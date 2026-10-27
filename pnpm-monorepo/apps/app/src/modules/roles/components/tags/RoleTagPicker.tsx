"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { FaTags } from "react-icons/fa";
import { useRolesContext } from "../RolesContext";
import { RoleTagPanel } from "./RoleTagPanel";
import { RoleTagPickerChip } from "./RoleTagPickerChip";

interface Props {
  readonly className?: string;
  readonly value: readonly BadgeRoleTag["id"][];
  readonly onChange: (tagIds: BadgeRoleTag["id"][]) => void;
}

/**
 * Offers the tags of the roles context in a popover, with the look of the
 * role picker in multiple mode: a click on a tag selects or deselects it,
 * and the selected tags show under the trigger. A selected tag that is not
 * in the roles context shows as a placeholder.
 */
export const RoleTagPicker = ({ className, value, onChange }: Props) => {
  const { tags } = useRolesContext();

  const removeTag = (tagId: BadgeRoleTag["id"]) => {
    onChange(value.filter((selectedTagId) => selectedTagId !== tagId));
  };

  const toggleTag = (tagId: BadgeRoleTag["id"]) => {
    if (value.includes(tagId)) {
      removeTag(tagId);
    } else {
      onChange([...value, tagId]);
    }
  };

  /**
   * The context gives the tags sorted by name. The tags that the context
   * does not have come last.
   */
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const sortedTagIds = [
    ...tags.filter((tag) => value.includes(tag.id)).map((tag) => tag.id),
    ...value.filter((tagId) => !tagById.has(tagId)),
  ];

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
          selectedTagIds={value}
          onTagClick={toggleTag}
        />
      </ItemPickerPopover>

      {sortedTagIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {sortedTagIds.map((tagId) => (
            <RoleTagPickerChip
              key={tagId}
              tagId={tagId}
              tag={tagById.get(tagId)}
              onRemove={removeTag}
            />
          ))}
        </div>
      )}
    </div>
  );
};
