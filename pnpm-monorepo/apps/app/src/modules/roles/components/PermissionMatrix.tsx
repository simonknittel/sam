import { getRolesWithPermissionStrings } from "../queries/getRoles";
import { PermissionMatrixGrid } from "./PermissionMatrixGrid";

export const PermissionMatrix = async () => {
  const roles = await getRolesWithPermissionStrings();

  /**
   * Mapped down to the exact shape the grid renders, so the RSC payload
   * carries each role once and nothing else.
   */
  const matrixRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    icon: role.icon,
    permissionStrings: role.permissionStrings.map(
      (permissionString) => permissionString.permissionString,
    ),
  }));

  return (
    <section className="p-4 lg:p-6 rounded-primary bg-secondary overflow-x-scroll">
      <PermissionMatrixGrid roles={matrixRoles} />
    </section>
  );
};
