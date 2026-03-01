import { Tile } from "@/modules/common/components/Tile";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import {
  getAssignableRoles,
  getAssignedRoles,
} from "@/modules/roles/utils/getRoles";
import { type Entity, type RoleAssignment } from "@prisma/client";
import clsx from "clsx";
import { AddRoles } from "./AddRoles";

interface Props {
  readonly className?: string;
  readonly entity: Entity & {
    roleAssignments: RoleAssignment[];
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

          {/* <ImpersonateRoles roles={visibleRoles} /> */}
        </div>
      )}
    </Tile>
  );
};
