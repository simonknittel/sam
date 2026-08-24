import { requireAuthentication } from "@/modules/auth/server";
import { AddRoles } from "@/modules/citizen/components/roles/AddRoles";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { getAssignedRoles } from "@/modules/roles/utils/getRoles";
import {
  type Entity,
  type RoleAssignment,
} from "@sam-monorepo/database/client";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly entity: Pick<Entity, "id"> & {
    readonly roleAssignments: readonly Pick<
      RoleAssignment,
      "roleId" | "currentLevel"
    >[];
  };
  readonly assignableRoles: readonly BadgeRole[];
}

export const RolesCell = async ({
  className,
  entity,
  assignableRoles,
}: Props) => {
  const authentication = await requireAuthentication();

  const showUpdateRolesButton =
    (await authentication.authorize("otherRole", "assign", [
      {
        key: "roleId",
        value: "*",
      },
    ])) ||
    (await authentication.authorize("otherRole", "dismiss", [
      {
        key: "roleId",
        value: "*",
      },
    ]));

  const roles = await getAssignedRoles(entity);

  return (
    <>
      {roles.length > 0 ? (
        <div className={clsx("flex gap-1", className)}>
          {roles.map((role) => (
            <SingleRoleBadge
              key={role.id}
              roleId={role.id}
              citizenId={entity.id}
              citizenLevel={role.currentLevel}
            />
          ))}
        </div>
      ) : (
        <p className="text-neutral-500 italic">-</p>
      )}

      {showUpdateRolesButton && assignableRoles.length > 0 && (
        <AddRoles
          citizenId={entity.id}
          assignedRoleIds={roles.map((role) => role.id)}
          iconOnly={true}
        />
      )}
    </>
  );
};
