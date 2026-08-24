"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { Link } from "@/modules/common/components/Link";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import Image from "next/image";
import type { ChangeEventHandler } from "react";
import { updateSingleRolePermission } from "../actions/updateSingleRolePermission";
import { STATIC_PERMISSIONS } from "../utils/STATIC_PERMISSIONS";

export interface MatrixRole extends Pick<Role, "id" | "name"> {
  readonly icon: Pick<Upload, "id" | "mimeType"> | null;
  readonly permissionStrings: readonly string[];
}

/**
 * Sorted once at module scope, so the columns and every row agree on the
 * order without mutating the shared constant.
 */
const permissions = STATIC_PERMISSIONS.toSorted((a, b) =>
  a.section.localeCompare(b.section),
);

const gridTemplateColumns = `240px repeat(${permissions.length}, 32px)`;

const getPermissionLabel = (
  permission: (typeof STATIC_PERMISSIONS)[number],
) => {
  return permission.section
    ? `${permission.section} / ${permission.title}`
    : permission.title;
};

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
                  {permission.section && (
                    <span className="text-neutral-700">
                      {permission.section} /{" "}
                    </span>
                  )}
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
      className="grid items-center gap-2 -mx-2"
      style={{
        gridTemplateColumns,
      }}
    >
      <td className="h-8 overflow-hidden sticky -left-2 z-10 bg-secondary rounded-secondary">
        <Link
          href={`/app/roles/${role.id}`}
          className="flex items-center gap-2 hover:bg-neutral-800 px-2 rounded-secondary h-full"
          prefetch={false}
        >
          {role.icon ? (
            <div className="aspect-square size-4 flex items-center justify-center rounded-secondary overflow-hidden flex-none">
              <Image
                src={getPublicUploadUrl(role.icon.id)}
                alt=""
                width={16}
                height={16}
                className="max-w-full max-h-full"
                unoptimized={["image/svg+xml", "image/gif"].includes(
                  role.icon.mimeType,
                )}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="size-4 flex-none" />
          )}

          <p className="truncate text-sm">{role.name}</p>
        </Link>
      </td>

      {permissions.map((permission) => (
        <MatrixCell
          key={permission.string}
          roleId={role.id}
          permissionString={permission.string}
          label={`${getPermissionLabel(permission)} – ${role.name}`}
          defaultChecked={grantedPermissionStrings.has(permission.string)}
        />
      ))}
    </tr>
  );
};

interface MatrixCellProps {
  readonly roleId: MatrixRole["id"];
  readonly permissionString: string;
  readonly label: string;
  readonly defaultChecked: boolean;
}

/**
 * A deliberately minimal checkbox: the matrix renders thousands of these
 * cells, so every element counts. The check mark comes from the mask-check
 * utility instead of the two inline SVGs that YesNoCheckbox renders, and
 * the label and title name the cell, which the matrix cannot do visually.
 */
const MatrixCell = ({
  roleId,
  permissionString,
  label,
  defaultChecked,
}: MatrixCellProps) => {
  return (
    <td>
      <label className="group flex cursor-pointer" title={label}>
        <input
          type="checkbox"
          className="peer sr-only"
          name={`${roleId}_${permissionString}`}
          defaultChecked={defaultChecked}
          aria-label={label}
        />
        <span className="size-8 rounded-secondary bg-neutral-700 group-active:bg-neutral-600 peer-focus-visible:outline-solid peer-focus-visible:outline-1 peer-focus-visible:outline-offset-1 after:block after:size-full after:mask-check after:bg-green-500 after:opacity-0 peer-checked:after:opacity-100 group-hover:peer-[:not(:checked)]:after:opacity-50 peer-focus:peer-[:not(:checked)]:after:opacity-50" />
      </label>
    </td>
  );
};
