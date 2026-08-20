import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { api } from "@/modules/common/utils/api";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { Role } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { useState } from "react";
import { FaTrash, FaUsers } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly defaultValue?: Role["id"][];
}

export const RequiredRoles = ({ className, defaultValue }: Props) => {
  const { isPending, data } = api.roles.getVisibleRoles.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [selectedRoles, setSelectedRoles] = useState<Role["id"][]>(
    defaultValue || [],
  );

  const handleSelectRole = (roleId: Role["id"]) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) return prev;
      return [...prev, roleId];
    });
  };

  return (
    <div className={clsx(className)}>
      <p className="mb-1">Erforderliche Rolle(n)</p>

      <PopoverBaseUI
        title="Rolle auswählen"
        trigger={
          <>
            <FaUsers /> Rolle auswählen
          </>
        }
        triggerRender={
          <Button2
            type="button"
            title="Rolle auswählen"
            variant={Button2Variant.Secondary}
            className="flex-none"
            disabled={isPending}
          />
        }
        openOnHover={false}
        positionerClassName="z-40"
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

      <p className="text-xs mt-1 text-gray-400">
        Dieser Task kann nur von den ausgewählten Rollen angenommen werden.
        optional
      </p>

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
                    setSelectedRoles((prev) =>
                      prev.filter((id) => id !== role!.id),
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

                <input type="hidden" name="requiredRole[]" value={role!.id} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
