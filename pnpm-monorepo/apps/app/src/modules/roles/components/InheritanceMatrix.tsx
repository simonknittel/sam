import { getRolesWithInheritance } from "../queries/getRoles";
import { InheritanceMatrixGrid } from "./InheritanceMatrixGrid";

export const InheritanceMatrix = async () => {
  const roles = await getRolesWithInheritance();

  /**
   * Mapped down to the exact shape the grid renders, so the RSC payload
   * carries each role once and nothing else.
   */
  const matrixRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    icon: role.icon,
    inheritedRoleIds: role.inherits.map((inheritedRole) => inheritedRole.id),
  }));

  return (
    <section className="p-4 lg:p-6 rounded-primary bg-secondary overflow-x-scroll">
      <p className="max-w-prose">
        Eine markierte Zelle bedeutet: Die Rolle der Zeile erhält alle
        Berechtigungen der Rolle der Spalte. Verschachtelte Vererbungen werden
        nicht berücksichtigt.
      </p>

      <InheritanceMatrixGrid roles={matrixRoles} />
    </section>
  );
};
