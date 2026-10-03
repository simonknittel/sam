import Button from "@/modules/common/components/Button";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { api, type RouterOutputs } from "@/trpc/react";
import type { Role } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { useState } from "react";
import { FaPen, FaUsers } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly defaultValue?: Role["id"] | null;
  readonly onChange?: (roleId: Role["id"] | null) => void;
}

type RolesForSalaries = RouterOutputs["silc"]["getRolesForSalaries"];

export const RoleSelector = ({ className, defaultValue, onChange }: Props) => {
  const { isPending, data } = api.silc.getRolesForSalaries.useQuery(undefined);

  const [selectedRole, setSelectedRole] = useState<Role["id"] | null>(
    defaultValue || null,
  );

  const handleSelectRole = (roleId: Role["id"]) => {
    setSelectedRole(roleId);
    onChange?.(roleId);
  };

  return (
    <>
      {selectedRole && (
        <input type="hidden" name="roleId[]" value={selectedRole} />
      )}

      <PopoverBaseUI
        title="Rolle auswählen"
        trigger={
          data && selectedRole ? (
            <span className="flex items-center justify-between gap-1">
              <SingleRoleBadge
                className="bg-transparent"
                roleId={
                  data.find((role) => role.role.id === selectedRole)!.role.id
                }
                showPlaceholder
              />
              <FaPen className="flex-none text-brand-red-500" />
            </span>
          ) : (
            <>
              <FaUsers className="flex-none" /> Rolle auswählen
            </>
          )
        }
        triggerRender={
          data && selectedRole ? (
            <button
              type="button"
              className={clsx(
                "flex items-center justify-between gap-1 rounded-secondary bg-neutral-700/50 pr-3 hover:bg-neutral-600/50",
                className,
              )}
            />
          ) : (
            <Button
              type="button"
              title="Rolle auswählen"
              variant="secondary"
              className={clsx(className, {
                "flex-none animate-pulse": !data,
              })}
              disabled={isPending}
            />
          )
        }
        openOnHover={false}
        childrenClassName="max-h-96 overflow-auto"
      >
        <RoleList data={data} onSelectRole={handleSelectRole} />
      </PopoverBaseUI>
    </>
  );
};

interface RoleListProps {
  readonly data: RolesForSalaries | undefined;
  readonly onSelectRole: (roleId: Role["id"]) => void;
}

const RoleList = ({ data, onSelectRole }: RoleListProps) => {
  const { closePopover } = usePopoverBaseUI();

  return (
    <div className="flex flex-col gap-2">
      {data
        ? data
            .toSorted((a, b) => a.role.name.localeCompare(b.role.name))
            .map((role) => (
              <button
                key={role.role.id}
                type="button"
                onClick={() => {
                  onSelectRole(role.role.id);
                  closePopover();
                }}
                className="group"
              >
                <SingleRoleBadge
                  roleId={role.role.id}
                  showPlaceholder
                  className="bg-transparent group-hover:bg-neutral-700/50 group-focus-visible:bg-neutral-700/50"
                />
              </button>
            ))
        : null}
    </div>
  );
};
