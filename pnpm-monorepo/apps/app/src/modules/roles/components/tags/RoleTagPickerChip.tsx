"use client";

import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { FaTrash } from "react-icons/fa";
import { UploadedIcon, UploadedIconSize } from "@/modules/common/components/UploadedIcon";

interface Props {
  readonly tag: BadgeRoleTag;
  readonly onRemove: (tagId: BadgeRoleTag["id"]) => void;
}

/**
 * A selected tag under the trigger of the tag picker, with the look of a
 * selected role of the role picker
 */
export const RoleTagPickerChip = ({ tag, onRemove }: Props) => {
  return (
    <button
      type="button"
      onClick={() => onRemove(tag.id)}
      title="Tag entfernen"
      className="group flex max-w-full cursor-pointer items-center gap-2 rounded-secondary bg-neutral-700/50 px-2 outline-offset-2 outline-interaction-700 hover:bg-neutral-700/70 focus-visible:bg-neutral-700/70 focus-visible:outline-2 active:bg-neutral-700/40"
    >
      <span className="flex h-8 max-w-full items-center gap-2">
        {tag.icon && (
          <span className="flex size-6 flex-none items-center justify-center">
            <UploadedIcon upload={tag.icon} size={UploadedIconSize.Medium} />
          </span>
        )}

        <span className="truncate font-mono text-sm" title={tag.name}>
          {tag.name}
        </span>
      </span>

      <FaTrash className="flex-none text-brand-red-500 group-hover:text-brand-red-300 group-focus-visible:text-brand-red-300 group-active:text-brand-red-700" />
    </button>
  );
};
