"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import type { ChangeEventHandler } from "react";
import { updateSingleRolePermission } from "../actions/updateSingleRolePermission";
import { STATIC_PERMISSIONS } from "../utils/STATIC_PERMISSIONS";
import { MatrixCell } from "./MatrixCell";
import { MatrixRoleCell } from "./MatrixRoleCell";

interface MatrixRole extends Readonly<Pick<Role, "id" | "name">> {
  readonly icon: Pick<Upload, "id" | "mimeType"> | null;
  readonly permissionStrings: readonly string[];
}

/**
 * Sorted once at module scope, so the columns and every row agree on the
 * order without mutating the shared constant. The locale is pinned because
 * this module renders on the server and in the browser, and the two must
 * not disagree on the order (a hydration mismatch).
 */
const permissions = STATIC_PERMISSIONS.toSorted((first, second) =>
  first.section.localeCompare(second.section, "de"),
);

const gridTemplateColumns = `240px repeat(${permissions.length}, 32px)`;

interface Props {
  readonly roles: readonly MatrixRole[];
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
    const checked = input.checked ? "true" : "";

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("permissionString", permissionString);
    formData.set("checked", checked);

    void runAction(updateSingleRolePermission, formData);
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
                <span>Rolle</span>
              </div>
            </th>

            {permissions.map((permission) => (
              <th
                key={permission.string}
                className="font-normal whitespace-nowrap flex justify-center items-end"
              >
                <div className="-rotate-45 w-0">
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
  readonly role: MatrixRole;
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
      className="grid items-center gap-2 -mx-2 [contain-intrinsic-height:2rem] [content-visibility:auto]"
      style={{
        gridTemplateColumns,
      }}
    >
      <MatrixRoleCell role={role} href={`/app/roles/${role.id}`} />

      {permissions.map((permission) => (
        <MatrixCell
          key={permission.string}
          name={`${role.id}_${permission.string}`}
          label={`${permission.section} / ${permission.title} – ${role.name}`}
          defaultChecked={grantedPermissionStrings.has(permission.string)}
        />
      ))}
    </tr>
  );
};
