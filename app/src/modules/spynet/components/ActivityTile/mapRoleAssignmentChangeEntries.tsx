import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import {
  RoleAssignmentChangeType,
  type Entity,
  type RoleAssignmentChange,
} from "@prisma/client";

export const mapRoleAssignmentChangeEntries = async (
  entries: (Pick<
    RoleAssignmentChange,
    "id" | "createdAt" | "type" | "roleId"
  > & {
    citizen: Pick<Entity, "id" | "handle">;
    createdBy: Pick<Entity, "id" | "handle"> | null;
  })[],
) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("otherRole", "read"))) return [];

  const visibleRoles = await getVisibleRoles();

  return entries
    .filter((change) =>
      visibleRoles.some((visibleRole) => visibleRole.id === change.roleId),
    )
    .map((change) => {
      let message;
      switch (change.type) {
        case RoleAssignmentChangeType.ADD:
          message = (
            <p>
              Citizen <CitizenLink citizen={change.citizen} /> wurde die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} />{" "}
              hinzugefügt
            </p>
          );
          break;
        case RoleAssignmentChangeType.REMOVE:
          message = (
            <p>
              Citizen <CitizenLink citizen={change.citizen} /> wurde die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} />{" "}
              entfernt
            </p>
          );
          break;
        default:
          throw new Error(
            `Unknown change.type: ${change.type satisfies never}`,
          );
      }

      return {
        key: change.id,
        date: change.createdAt,
        message,
        author: change.createdBy,
      };
    });
};
