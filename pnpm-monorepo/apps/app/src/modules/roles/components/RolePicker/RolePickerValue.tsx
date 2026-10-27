"use client";

import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import type { RolePickerExtraEntry, RolePickerRole } from "./RolePanel";
import { UploadedIcon, UploadedIconSize } from "./UploadedIcon";

interface Props {
  readonly roleId: BadgeRole["id"];
  /** The roles of the picker */
  readonly roles: readonly RolePickerRole[];
  readonly extraEntries: readonly RolePickerExtraEntry[];
}

/**
 * A selected role or extra entry, with the look of the role badge. A selected
 * role that is not in the roles of the picker (the viewer cannot see it)
 * shows as a placeholder, because the picker still submits it: a save
 * without it would remove it from the record.
 */
export const RolePickerValue = ({ roleId, roles, extraEntries }: Props) => {
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

  const role = roles.find((role) => role.id === roleId);
  if (!role)
    return (
      <span
        className="inline-flex h-8 items-center px-2 font-mono text-sm text-neutral-500"
        title="Diese Rolle ist ausgewählt, du darfst sie aber nicht sehen."
      >
        Verborgene Rolle
      </span>
    );

  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 px-2 align-middle">
      {role.icon && (
        <span className="flex size-6 flex-none items-center justify-center">
          <UploadedIcon upload={role.icon} size={UploadedIconSize.Medium} />
        </span>
      )}

      <span className="truncate font-mono text-sm" title={role.name}>
        {role.name}
      </span>
    </span>
  );
};
