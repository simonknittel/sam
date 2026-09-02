"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/modules/common/utils/api";
import { useRolesContext } from "@/modules/roles/components/RolesContext";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { Role } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useState } from "react";
import { FaTrash, FaUsers } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /** Name of the hidden inputs, e.g. "readRole[]" */
  readonly inputName: string;
  readonly defaultValue?: Role["id"][];
  /**
   * Pick exactly one role instead of many: picking replaces the current
   * selection, so at most one hidden input is submitted.
   */
  readonly single?: boolean;
  /**
   * Restricts the offered roles, e.g. to those allowed to read the parent
   * page. Already selected roles outside the list stay selected and
   * removable so the reason for a rejected save stays visible.
   */
  readonly selectableRoleIds?: readonly Role["id"][];
}

/**
 * Role picker submitting the selected role ids as hidden inputs — multi
 * select by default, see `single`.
 */
export const WikiRoleSelector = ({
  className,
  inputName,
  defaultValue,
  single = false,
  selectableRoleIds,
}: Props) => {
  const { isPending, data: allRoles } = api.roles.getVisibleRoles.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const selectableRoles = selectableRoleIds
    ? allRoles?.filter((role) => selectableRoleIds.includes(role.id))
    : allRoles;

  const [selectedRoles, setSelectedRoles] = useState<Role["id"][]>(
    defaultValue || [],
  );

  const handleSelectRole = (roleId: Role["id"]) => {
    setSelectedRoles((previous) => {
      if (single) return [roleId];
      if (previous.includes(roleId)) return previous;
      return [...previous, roleId];
    });
  };

  return (
    <div className={clsx(className)}>
      <PopoverBaseUI
        title="Rolle auswählen"
        trigger={
          <span
            className={clsx(
              "flex items-center gap-2 rounded-secondary border border-neutral-700 px-3 h-9 text-sm hover:bg-neutral-800",
              { "opacity-50": isPending },
            )}
          >
            <FaUsers /> {single ? "Rolle auswählen" : "Rolle hinzufügen"}
          </span>
        }
        childrenClassName="max-h-96 overflow-auto"
      >
        <div className="flex flex-col gap-2">
          {selectableRoles
            ? selectableRoles
                .toSorted((a, b) => a.name.localeCompare(b.name))
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.id)}
                    className="group"
                  >
                    {/* The badge's own popover trigger would nest buttons here */}
                    <SingleRoleBadge
                      roleId={role.id}
                      showPlaceholder
                      withPopover={false}
                      className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                    />
                  </button>
                ))
            : null}
        </div>
      </PopoverBaseUI>

      {selectedRoles.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {selectedRoles.map((selectedRoleId) => (
            <SelectedRole
              key={selectedRoleId}
              roleId={selectedRoleId}
              inputName={inputName}
              onRemove={() =>
                setSelectedRoles((previous) =>
                  previous.filter((id) => id !== selectedRoleId),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SelectedRoleProps {
  readonly roleId: Role["id"];
  readonly inputName: string;
  readonly onRemove: () => void;
}

/**
 * One selected role, with the hidden input that submits it. The input never
 * waits for the role list and never depends on the viewer being allowed to
 * read the role: a role the viewer cannot name still belongs to the record,
 * and leaving it out of the submission would delete it on the next save.
 */
const SelectedRole = ({ roleId, inputName, onRemove }: SelectedRoleProps) => {
  const { roles } = useRolesContext();
  const isNameable = roles.some((role) => role.id === roleId);

  return (
    <div>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1 bg-neutral-700/50 pr-2 rounded-secondary"
      >
        {isNameable ? (
          <SingleRoleBadge
            className="bg-transparent"
            roleId={roleId}
            showPlaceholder
            withPopover={false}
          />
        ) : (
          <span
            className="px-2 h-8 inline-flex items-center text-neutral-500"
            title="Diese Rolle ist ausgewählt, du darfst sie aber nicht sehen."
          >
            Verborgene Rolle
          </span>
        )}

        <FaTrash className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 flex-none" />
      </button>

      <input type="hidden" name={inputName} value={roleId} />
    </div>
  );
};
