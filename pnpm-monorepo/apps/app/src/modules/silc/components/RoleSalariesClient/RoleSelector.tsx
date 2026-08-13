import Button from "@/modules/common/components/Button";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { api, type RouterOutputs } from "@/modules/common/utils/api";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { Role } from "@sam-monorepo/database/client";
import { useState, type CSSProperties } from "react";
import { FaPen, FaUsers } from "react-icons/fa";

interface Props {
  readonly style?: CSSProperties;
  readonly defaultValue?: Role["id"] | null;
  readonly onChange?: (roleId: Role["id"] | null) => void;
}

type RolesForSalaries = RouterOutputs["silc"]["getRolesForSalaries"];

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
  };

  return (
    <>
      {selectedRole && (
        <input type="hidden" name="roleId[]" value={selectedRole} />
      )}

      <PopoverBaseUI
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
              <FaPen className="text-brand-red-500 flex-none" />
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
              className="flex items-center justify-between gap-1 bg-neutral-700/50 hover:bg-neutral-600/50 pr-3 rounded-secondary"
              style={style}
            />
          ) : (
            <Button
              type="button"
              title="Rolle auswählen"
              variant="secondary"
              className={data ? undefined : "flex-none animate-pulse"}
              style={style}
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
