"use client";

import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { FaTrash } from "react-icons/fa";
import type { RolePickerExtraEntry } from "./RolePanel";
import { RolePickerValue } from "./RolePickerValue";

interface Props {
  readonly roleId: BadgeRole["id"];
  readonly extraEntries: readonly RolePickerExtraEntry[];
  readonly onRemove: (roleId: BadgeRole["id"]) => void;
}

/** A selected role under the trigger of the role picker in multiple mode */
export const RolePickerChip = ({ roleId, extraEntries, onRemove }: Props) => {
  return (
    <button
      type="button"
      onClick={() => onRemove(roleId)}
      title="Rolle entfernen"
      className="group flex max-w-full cursor-pointer items-center gap-1 rounded-secondary bg-neutral-700/50 pr-2 outline-offset-2 outline-interaction-700 hover:bg-neutral-700/70 focus-visible:bg-neutral-700/70 focus-visible:outline-2 active:bg-neutral-700/40"
    >
      <RolePickerValue roleId={roleId} extraEntries={extraEntries} />

      <FaTrash className="flex-none text-brand-red-500 group-hover:text-brand-red-300 group-focus-visible:text-brand-red-300 group-active:text-brand-red-700" />
    </button>
  );
};
