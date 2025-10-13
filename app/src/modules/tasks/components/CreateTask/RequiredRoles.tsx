import { Button2 } from "@/modules/common/components/Button2";
import { api } from "@/modules/common/utils/api";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import type { Role } from "@prisma/client";
import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { useRef, useState } from "react";
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

  const [isOpen, setIsOpen] = useState(false);

  const popoverPortalRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={clsx(className)}>
      <p className="mb-1">Erforderliche Rolle(n)</p>

      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <Button2
            type="button"
            title="Rolle auswählen"
            variant="secondary"
            className="flex-none"
            disabled={isPending}
          >
            <FaUsers /> Rolle auswählen
          </Button2>
        </Popover.Trigger>

        <Popover.Portal container={popoverPortalRef.current}>
          <Popover.Content sideOffset={4} side="top">
            <div className="flex flex-col gap-2 p-4 rounded-secondary bg-neutral-800 border border-brand-red-500 max-h-96 overflow-auto">
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
                        <SingleRole
                          role={role}
                          showPlaceholder
                          className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                        />
                      </button>
                    ))
                : null}
            </div>

            <Popover.Arrow className="fill-neutral-800" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div ref={popoverPortalRef} className="z-10" />

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
                  <SingleRole
                    className="bg-transparent"
                    role={role!}
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
