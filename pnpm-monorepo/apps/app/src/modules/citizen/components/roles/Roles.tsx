import { Tile } from "@/modules/common/components/Tile";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import {
  getAssignableRoles,
  getAssignedRoles,
} from "@/modules/roles/utils/getRoles";
import {
  type Entity,
  type RoleAssignment,
} from "@sam-monorepo/database/client";
import clsx from "clsx";
import { AddRoles } from "./AddRoles";

interface Props {
  readonly className?: string;
  readonly entity: Pick<Entity, "id"> & {
    readonly roleAssignments: readonly Pick<
      RoleAssignment,
      "roleId" | "currentLevel"
    >[];
  };
}

export const Roles = async ({ className, entity }: Props) => {
  const assignedAndVisibleRoles = await getAssignedRoles(entity);
  const assignedAndVisibleRoleIds = assignedAndVisibleRoles.map(
    (role) => role.id,
  );

  const assignableRoles = await getAssignableRoles();
  const canUpdateAnyRoleAssignment = Boolean(assignableRoles.length);

  return (
    <Tile heading="Rollen" className={clsx(className)}>
      {assignedAndVisibleRoles.length > 0 ? (
        <div className="flex gap-1 flex-wrap">
          {assignedAndVisibleRoles.map((role) => (
            <SingleRoleBadge
              key={role.id}
              roleId={role.id}
              citizenId={entity.id}
              citizenLevel={role.currentLevel}
            />
          ))}
        </div>
      ) : (
        <p className="text-neutral-500 italic">Keine Rollen</p>
      )}

      {canUpdateAnyRoleAssignment && (
        <div className="flex gap-4 mt-2">
          <AddRoles
            citizenId={entity.id}
            assignedRoleIds={assignedAndVisibleRoleIds}
          />
        </div>
      )}
    </Tile>
  );
};
