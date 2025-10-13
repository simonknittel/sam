import Button from "@/modules/common/components/Button";
import { api } from "@/modules/common/utils/api";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import type { Role } from "@prisma/client";
import * as Popover from "@radix-ui/react-popover";
import { useState, type CSSProperties } from "react";
import { FaPen, FaUsers } from "react-icons/fa";

interface Props {
  readonly style?: CSSProperties;
  readonly defaultValue?: Role["id"] | null;
  readonly onChange?: (roleId: Role["id"] | null) => void;
}

export const RoleSelector = ({ style, defaultValue, onChange }: Props) => {
  const { isPending, data } = api.silc.getRolesForSalaries.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [selectedRole, setSelectedRole] = useState<Role["id"] | null>(
    defaultValue || null,
  );

  const handleSelectRole = (roleId: Role["id"]) => {
    setSelectedRole(roleId);
    onChange?.(roleId);
    setIsOpen(false);
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {selectedRole && (
        <input type="hidden" name="roleId[]" value={selectedRole} />
      )}

      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          {data ? (
            selectedRole ? (
              <button
                type="button"
                className="flex items-center justify-between gap-1 bg-neutral-700/50 hover:bg-neutral-600/50 pr-3 rounded-secondary"
                style={style}
              >
                <SingleRole
                  className="bg-transparent"
                  role={
                    data.find((role) => role.role.id === selectedRole)!.role
                  }
                  showPlaceholder
                />
                <FaPen className="text-brand-red-500 flex-none" />
              </button>
            ) : (
              <Button
                type="button"
                title="Rolle auswählen"
                variant="secondary"
                style={style}
              >
                <FaUsers className="flex-none" /> Rolle auswählen
              </Button>
            )
          ) : (
            <Button
              type="button"
              title="Rolle auswählen"
              variant="secondary"
              className="flex-none animate-pulse"
              style={style}
              disabled={isPending}
            >
              <FaUsers className="flex-none" /> Rolle auswählen
            </Button>
          )}
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content sideOffset={4} side="top">
            <div className="flex flex-col gap-2 p-4 rounded-secondary bg-neutral-800 border border-brand-red-500 max-h-96 overflow-auto">
              {data
                ? data
                    .toSorted((a, b) => a.role.name.localeCompare(b.role.name))
                    .map((role) => (
                      <button
                        key={role.role.id}
                        type="button"
                        onClick={() => handleSelectRole(role.role.id)}
                        className="group"
                      >
                        <SingleRole
                          role={role.role}
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
    </>
  );
};
