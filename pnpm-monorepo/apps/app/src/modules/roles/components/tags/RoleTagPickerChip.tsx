"use client";

import { ItemPickerChip } from "@/modules/common/components/ItemPicker/ItemPickerChip";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";

interface Props {
  readonly tagId: BadgeRoleTag["id"];
  /** Undefined when the roles context does not have the tag */
  readonly tag: BadgeRoleTag | undefined;
  readonly onRemove: (tagId: BadgeRoleTag["id"]) => void;
}

/**
 * A selected tag under the trigger of the tag picker, with the look of a
 * selected role of the role picker. A selected tag that is not in the roles
 * context (for example, a different user deleted it) shows as a placeholder.
 */
export const RoleTagPickerChip = ({ tagId, tag, onRemove }: Props) => {
  return (
    <ItemPickerChip title="Tag entfernen" onRemove={() => onRemove(tagId)}>
      {tag ? (
        <span className="inline-flex h-8 max-w-full items-center gap-2 px-2 align-middle">
          {tag.icon && (
            <span className="flex size-6 flex-none items-center justify-center">
              <UploadedIcon upload={tag.icon} size={UploadedIconSize.Medium} />
            </span>
          )}

          <span className="truncate font-mono text-sm" title={tag.name}>
            {tag.name}
          </span>
        </span>
      ) : (
        <span
          className="inline-flex h-8 items-center px-2 font-mono text-sm text-neutral-500"
          title="Diesen Tag gibt es nicht mehr, oder die Seite ist nicht aktuell."
        >
          Unbekannter Tag
        </span>
      )}
    </ItemPickerChip>
  );
};
