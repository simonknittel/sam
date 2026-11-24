"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { InheritanceMatrixRole } from "@sam-monorepo/application";
import type { ChangeEventHandler, CSSProperties } from "react";
import { updateSingleRoleInheritance } from "../actions/updateSingleRoleInheritance";
import { MatrixCell } from "./MatrixCell";
import { MatrixRoleCell } from "./MatrixRoleCell";

const SELF_INHERITANCE_TITLE = "Eine Rolle kann sich nicht selbst erben.";

interface Props {
  readonly roles: readonly InheritanceMatrixRole[];
}

/**
 * One client component for the reason in `PermissionMatrixGrid`.
 *
 * A checked cell means: the role of the row inherits the role of the column.
 */
export const InheritanceMatrixGrid = ({ roles }: Props) => {
  const tableStyle = {
    "--table-columns": `240px repeat(${roles.length}, 32px)`,
  } satisfies CSSProperties;

  const handleChange: ChangeEventHandler<HTMLFormElement> = (event) => {
    const input = event.target as unknown as HTMLInputElement;
    /** See `PermissionMatrixGrid` */
    const separatorIndex = input.name.indexOf("_");
    const roleId = input.name.slice(0, separatorIndex);
    const inheritedRoleId = input.name.slice(separatorIndex + 1);

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("inheritedRoleId", inheritedRoleId);
    formData.set("checked", String(input.checked));

    void runAction(updateSingleRoleInheritance, formData);
  };

  return (
    <form onChange={handleChange}>
      <table style={tableStyle}>
        <thead>
          <tr className="-mx-2 grid h-64 grid-cols-(--table-columns) gap-2 text-left text-sm text-neutral-500">
            <th className="flex items-end justify-center font-normal whitespace-nowrap">
              <div className="w-0 -rotate-45">
                <span>Erbt …</span>
              </div>
            </th>

            {roles.map((role) => (
              <th
                key={role.id}
                className="flex items-end justify-center font-normal whitespace-nowrap"
                title={role.name}
              >
                <div className="w-0 -rotate-45">
                  {/* The zero-width parent anchors the rotation, so the name
                      is bounded on the span instead — a long role name would
                      otherwise reach past the top of the header row. */}
                  <span className="block w-max max-w-48 truncate">
                    {role.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="flex flex-col gap-2">
          {roles.map((role) => (
            <MatrixRow key={role.id} role={role} roles={roles} />
          ))}
        </tbody>
      </table>
    </form>
  );
};

interface MatrixRowProps {
  readonly role: InheritanceMatrixRole;
  readonly roles: readonly InheritanceMatrixRole[];
}

const MatrixRow = ({ role, roles }: MatrixRowProps) => {
  const inheritedRoleIds = new Set(role.inheritedRoleIds);

  return (
    <tr
      /** See `PermissionMatrixGrid` */
      className="-mx-2 grid grid-cols-(--table-columns) items-center gap-2 [contain-intrinsic-height:2rem] [content-visibility:auto]"
    >
      <MatrixRoleCell role={role} href={`/app/roles/${role.id}/inheritance`} />

      {roles.map((inheritedRole) =>
        inheritedRole.id === role.id ? (
          <SelfInheritanceCell key={inheritedRole.id} roleName={role.name} />
        ) : (
          <MatrixCell
            key={inheritedRole.id}
            name={`${role.id}_${inheritedRole.id}`}
            label={`${role.name} erbt ${inheritedRole.name}`}
            defaultChecked={inheritedRoleIds.has(inheritedRole.id)}
          />
        ),
      )}
    </tr>
  );
};

interface SelfInheritanceCellProps {
  readonly roleName: string;
}

/**
 * No control, so neither the keyboard nor a screen reader lands on something
 * that cannot be switched. The hidden text is for a screen reader, which does
 * not announce a title on a plain element.
 */
const SelfInheritanceCell = ({ roleName }: SelfInheritanceCellProps) => {
  return (
    <td>
      <div className="matrix-cell-blocked" title={SELF_INHERITANCE_TITLE}>
        <span className="sr-only">{`${roleName}: ${SELF_INHERITANCE_TITLE}`}</span>
      </div>
    </td>
  );
};
