import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import {
  RoleAssignmentLevelChangeType,
  type Entity,
  type RoleAssignmentLevelChange,
} from "@prisma/client";

export const mapRoleAssignmentLevelChangeEntries = async (
  entries: (Pick<
    RoleAssignmentLevelChange,
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
        case RoleAssignmentLevelChangeType.UP:
          message = (
            <p>
              Citizen <CitizenLink citizen={change.citizen} /> wurde die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} /> um
              ein Level erhöht
            </p>
          );
          break;
        case RoleAssignmentLevelChangeType.DOWN:
          message = (
            <p>
              Citizen <CitizenLink citizen={change.citizen} /> wurde die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} /> um
              ein Level verringert
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
