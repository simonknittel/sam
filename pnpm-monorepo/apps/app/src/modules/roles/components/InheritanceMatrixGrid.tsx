"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import type { ChangeEventHandler } from "react";
import { updateSingleRoleInheritance } from "../actions/updateSingleRoleInheritance";
import { MatrixCell } from "./MatrixCell";
import { MatrixRoleCell } from "./MatrixRoleCell";

interface MatrixRole extends Readonly<Pick<Role, "id" | "name">> {
  readonly icon: Pick<Upload, "id" | "mimeType"> | null;
  readonly inheritedRoleIds: readonly string[];
}

const SELF_INHERITANCE_TITLE = "Eine Rolle kann sich nicht selbst erben.";

interface Props {
  readonly roles: readonly MatrixRole[];
}

/**
 * The matrix is a single client component on purpose: one hydration island
 * that receives the roles as a compact prop. One client-component reference
 * per checkbox dominated the RSC payload and the hydration time of the
 * permission matrix, which this one mirrors.
 *
 * Rows and columns come from the same array, so both axes always agree on
 * the order. A checked cell means: the role of the row inherits the role of
 * the column.
 */
export const InheritanceMatrixGrid = ({ roles }: Props) => {
  const gridTemplateColumns = `240px repeat(${roles.length}, 32px)`;

  const handleChange: ChangeEventHandler<HTMLFormElement> = (event) => {
    const input = event.target as unknown as HTMLInputElement;
    /**
     * Split at the first underscore only: role ids are cuids and contain no
     * underscore. The rule matches the permission matrix, whose permission
     * strings do (example: `taskRewardType=NEW_SILC`).
     */
    const separatorIndex = input.name.indexOf("_");
    const roleId = input.name.slice(0, separatorIndex);
    const inheritedRoleId = input.name.slice(separatorIndex + 1);
    const checked = input.checked ? "true" : "";

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("inheritedRoleId", inheritedRoleId);
    formData.set("checked", checked);

    void runAction(updateSingleRoleInheritance, formData);
  };

  return (
    <form onChange={handleChange}>
      <table>
        <thead>
          <tr
            className="grid gap-2 text-left text-neutral-500 -mx-2 text-sm h-64"
            style={{
              gridTemplateColumns,
            }}
          >
            <th className="font-normal whitespace-nowrap flex justify-center items-end">
              <div className="-rotate-45 w-0">
                <span>Erbt …</span>
              </div>
            </th>

            {roles.map((role) => (
              <th
                key={role.id}
                className="font-normal whitespace-nowrap flex justify-center items-end"
                title={role.name}
              >
                <div className="-rotate-45 w-0">
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
            <MatrixRow
              key={role.id}
              role={role}
              roles={roles}
              gridTemplateColumns={gridTemplateColumns}
            />
          ))}
        </tbody>
      </table>
    </form>
  );
};

interface MatrixRowProps {
  readonly role: MatrixRole;
  readonly roles: readonly MatrixRole[];
  readonly gridTemplateColumns: string;
}

const MatrixRow = ({ role, roles, gridTemplateColumns }: MatrixRowProps) => {
  const inheritedRoleIds = new Set(role.inheritedRoleIds);

  return (
    <tr
      /**
       * content-visibility lets the browser skip layout and paint for the
       * rows outside the viewport; the intrinsic height keeps the scrollbar
       * stable and must agree with the h-8 cells.
       */
      className="grid items-center gap-2 -mx-2 [contain-intrinsic-height:2rem] [content-visibility:auto]"
      style={{
        gridTemplateColumns,
      }}
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
 * The cell on the diagonal. It carries no control at all, so neither the
 * keyboard nor a screen reader lands on something that cannot be switched.
 * The title says why the cell is dead for a mouse; the hidden text does the
 * same for a screen reader, which does not announce a title on a plain
 * element. One extra span per row is negligible, unlike one per cell.
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
