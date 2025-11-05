import { requireAuthentication } from "@/modules/auth/server";
import { AddRoles } from "@/modules/citizen/components/roles/AddRoles";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import { getAssignedRoles } from "@/modules/roles/utils/getRoles";
import {
  type Entity,
  type Role,
  type RoleAssignment,
  type Upload,
} from "@prisma/client";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly entity: Entity & {
    readonly roleAssignments: RoleAssignment[];
  };
  readonly assignableRoles: (Role & {
    icon: Upload | null;
  })[];
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
            <SingleRole key={role.id} role={role} />
          ))}
        </div>
      ) : (
        <p className="text-neutral-500 italic">-</p>
      )}

      {showUpdateRolesButton && assignableRoles.length > 0 && (
        <AddRoles
          entity={entity}
          allRoles={assignableRoles}
          assignedRoleIds={roles.map((role) => role.id)}
          iconOnly={true}
        />
      )}
    </>
  );
};
