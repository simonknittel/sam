"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { PermissionMatrixRole } from "@sam-monorepo/application";
import { PERMISSION_CATALOG } from "@sam-monorepo/domain";
import type { ChangeEventHandler, CSSProperties } from "react";
import { updateSingleRolePermission } from "../actions/updateSingleRolePermission";
import { MatrixCell } from "./MatrixCell";
import { MatrixRoleCell } from "./MatrixRoleCell";

/**
 * Sorted once at module scope, so the columns and every row agree on the
 * order without mutating the shared constant. The locale is pinned because
 * this module renders on the server and in the browser, and the two must
 * not disagree on the order (a hydration mismatch).
 */
const permissions = PERMISSION_CATALOG.toSorted((first, second) =>
  first.section.localeCompare(second.section, "de"),
);

const tableStyle = {
  "--table-columns": `240px repeat(${permissions.length}, 32px)`,
} satisfies CSSProperties;

interface Props {
  readonly roles: readonly PermissionMatrixRole[];
}

/**
 * The matrix is a single client component on purpose: one hydration island
 * that receives the roles as a compact prop. One client-component reference
 * per checkbox dominated the RSC payload and the hydration time of this
 * page.
 */
export const PermissionMatrixGrid = ({ roles }: Props) => {
  const handleChange: ChangeEventHandler<HTMLFormElement> = (event) => {
    const input = event.target as unknown as HTMLInputElement;
    /**
     * Split at the first underscore only: role ids are cuids and contain no
     * underscore, but permission strings can (example:
     * `taskRewardType=NEW_SILC`).
     */
    const separatorIndex = input.name.indexOf("_");
    const roleId = input.name.slice(0, separatorIndex);
    const permissionString = input.name.slice(separatorIndex + 1);

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("permissionString", permissionString);
    formData.set("checked", String(input.checked));

    void runAction(updateSingleRolePermission, formData);
  };

  return (
    <form onChange={handleChange}>
      <table style={tableStyle}>
        <thead>
          <tr className="-mx-2 grid h-64 grid-cols-(--table-columns) gap-2 text-left text-sm text-neutral-500">
            <th className="flex items-end justify-center font-normal whitespace-nowrap">
              <div className="w-0 -rotate-45">
                <span>Rolle</span>
              </div>
            </th>

            {permissions.map((permission) => (
              <th
                key={permission.permissionString}
                className="flex items-end justify-center font-normal whitespace-nowrap"
              >
                <div className="w-0 -rotate-45">
                  <span className="text-neutral-700">
                    {permission.section} /{" "}
                  </span>
                  <span>{permission.title}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="flex flex-col gap-2">
          {roles.map((role) => (
            <MatrixRow key={role.id} role={role} />
          ))}
        </tbody>
      </table>
    </form>
  );
};

interface MatrixRowProps {
  readonly role: PermissionMatrixRole;
}

const MatrixRow = ({ role }: MatrixRowProps) => {
  const grantedPermissionStrings = new Set(role.permissionStrings);

  return (
    <tr
      /**
       * content-visibility lets the browser skip layout and paint for the
       * rows outside the viewport; the intrinsic height keeps the scrollbar
       * stable and must agree with the h-8 cells.
       */
      className="-mx-2 grid grid-cols-(--table-columns) items-center gap-2 [contain-intrinsic-height:2rem] [content-visibility:auto]"
    >
      <MatrixRoleCell role={role} href={`/app/roles/${role.id}`} />

      {permissions.map((permission) => (
        <MatrixCell
          key={permission.permissionString}
          name={`${role.id}_${permission.permissionString}`}
          label={`${permission.section} / ${permission.title} – ${role.name}`}
          defaultChecked={grantedPermissionStrings.has(
            permission.permissionString,
          )}
        />
      ))}
    </tr>
  );
};
