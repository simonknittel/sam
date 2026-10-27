"use client";

import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { SingleRoleBadge } from "../SingleRoleBadge";
import type { RolePickerExtraEntry } from "./RolePanel";

interface Props {
  readonly roleId: BadgeRole["id"];
  readonly extraEntries: readonly RolePickerExtraEntry[];
}

/**
 * A selected role or extra entry. A selected role that the viewer cannot see
 * shows as a placeholder, because the picker still submits it: a save
 * without it would remove it from the record.
 */
export const RolePickerValue = ({ roleId, extraEntries }: Props) => {
  const extraEntry = extraEntries.find((entry) => entry.id === roleId);

  if (extraEntry)
    return (
      <span
        className="inline-block h-8 max-w-full truncate px-2 align-middle font-mono text-sm leading-8"
        title={extraEntry.name}
      >
        {extraEntry.name}
      </span>
    );

  return (
    <SingleRoleBadge
      className="bg-transparent"
      roleId={roleId}
      showPlaceholder
      withPopover={false}
      hiddenRoleTitle="Diese Rolle ist ausgewählt, du darfst sie aber nicht sehen."
    />
  );
};
