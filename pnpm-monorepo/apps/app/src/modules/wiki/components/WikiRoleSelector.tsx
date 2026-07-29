"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/modules/common/utils/api";
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
}

/**
 * Multi role picker submitting the selected role ids as hidden inputs.
 */
export const WikiRoleSelector = ({
  className,
  inputName,
  defaultValue,
}: Props) => {
  const { isPending, data } = api.roles.getVisibleRoles.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [selectedRoles, setSelectedRoles] = useState<Role["id"][]>(
    defaultValue || [],
  );

  const handleSelectRole = (roleId: Role["id"]) => {
    setSelectedRoles((previous) => {
      if (previous.includes(roleId)) return previous;
      return [...previous, roleId];
    });
  };

  return (
    <div className={clsx(className)}>
      <PopoverBaseUI
        trigger={
          <span
            className={clsx(
              "flex items-center gap-2 rounded-secondary border border-neutral-700 px-3 h-9 text-sm hover:bg-neutral-800",
              { "opacity-50": isPending },
            )}
          >
            <FaUsers /> Rolle hinzufügen
          </span>
        }
        childrenClassName="max-h-96 overflow-auto"
      >
        <div className="flex flex-col gap-2">
          {data
            ? data
                .toSorted((a, b) => a.name.localeCompare(b.name))
                .map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role.id)}
                    className="group"
                  >
                    <SingleRoleBadge
                      roleId={role.id}
                      showPlaceholder
                      className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                    />
                  </button>
                ))
            : null}
        </div>
      </PopoverBaseUI>

      {data && selectedRoles.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {selectedRoles
            .map((selectedRoleId) =>
              data.find((role) => role.id === selectedRoleId),
            )
            .filter(Boolean)
            .map((role) => (
              <div key={role!.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedRoles((previous) =>
                      previous.filter((id) => id !== role!.id),
                    )
                  }
                  className="flex items-center gap-1 bg-neutral-700/50 pr-2 rounded-secondary"
                >
                  <SingleRoleBadge
                    className="bg-transparent"
                    roleId={role!.id}
                    showPlaceholder
                  />
                  <FaTrash className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 flex-none" />
                </button>

                <input type="hidden" name={inputName} value={role!.id} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
