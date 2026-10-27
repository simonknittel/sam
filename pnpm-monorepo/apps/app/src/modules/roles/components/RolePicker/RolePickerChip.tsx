"use client";

import { ItemPickerChip } from "@/modules/common/components/ItemPicker/ItemPickerChip";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import type { RolePickerRole } from "./RolePanel";
import { RolePickerValue } from "./RolePickerValue";

interface Props {
  readonly roleId: BadgeRole["id"];
  /** The roles of the picker */
  readonly roles: readonly RolePickerRole[];
  readonly onRemove: (roleId: BadgeRole["id"]) => void;
}

/** A selected role under the trigger of the role picker in multiple mode */
export const RolePickerChip = ({ roleId, roles, onRemove }: Props) => {
  return (
    <ItemPickerChip title="Rolle entfernen" onRemove={() => onRemove(roleId)}>
      <RolePickerValue roleId={roleId} roles={roles} />
    </ItemPickerChip>
  );
};
