import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import {
  RoleAssignmentChangeType,
  type Entity,
  type RoleAssignmentChange,
} from "@prisma/client";

export const mapRoleAssignmentChangeEntries = async (
  entries: (Pick<RoleAssignmentChange, "id" | "createdAt" | "type" | "roleId"> & {
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
      const role = visibleRoles.find((role) => role.id === change.roleId)!;

      let message;
      switch (change.type) {
        case RoleAssignmentChangeType.ADD:
          message = (
            <p>
              Die Rolle <SingleRole key={role.id} role={role} /> wurde{" "}
              <CitizenLink citizen={change.citizen} /> hinzugefügt
              {change.createdBy && (
                <>
                  {" "}
                  von <CitizenLink citizen={change.createdBy} />
                </>
              )}
            </p>
          );
          break;
        case RoleAssignmentChangeType.REMOVE:
          message = (
            <p>
              Die Rolle <SingleRole key={role.id} role={role} /> wurde von{" "}
              <CitizenLink citizen={change.citizen} /> entfernt
              {change.createdBy && (
                <>
                  {" "}
                  von <CitizenLink citizen={change.createdBy} />
                </>
              )}
            </p>
          );
          break;
      }

      return {
        key: change.id,
        date: change.createdAt,
        message,
      };
    });
};
