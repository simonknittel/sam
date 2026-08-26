"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { Link } from "@/modules/common/components/Link";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import Image from "next/image";
import type { ChangeEventHandler } from "react";
import { updateSingleRoleInheritance } from "../actions/updateSingleRoleInheritance";

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
                  <span>{role.name}</span>
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
      <td className="h-8 overflow-hidden sticky -left-2 z-10 bg-secondary rounded-secondary">
        <Link
          href={`/app/roles/${role.id}/inheritance`}
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

          <p className="truncate text-sm" title={role.name}>
            {role.name}
          </p>
        </Link>
      </td>

      {roles.map((inheritedRole) =>
        inheritedRole.id === role.id ? (
          <SelfInheritanceCell key={inheritedRole.id} />
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

interface MatrixCellProps {
  readonly name: string;
  readonly label: string;
  readonly defaultChecked: boolean;
}

/**
 * A deliberately minimal checkbox: the matrix renders thousands of these
 * cells, so every element and every attribute byte counts. The styles and
 * the states live in the matrix-cell utility, and the label and title name
 * the cell, which the matrix cannot do visually.
 */
const MatrixCell = ({ name, label, defaultChecked }: MatrixCellProps) => {
  return (
    <td>
      <label className="matrix-cell" title={label}>
        <input
          type="checkbox"
          className="sr-only"
          name={name}
          defaultChecked={defaultChecked}
          aria-label={label}
        />
        <span />
      </label>
    </td>
  );
};

/**
 * The cell on the diagonal. It carries no control at all, so neither the
 * keyboard nor a screen reader lands on something that cannot be switched;
 * the title says why the cell is dead.
 */
const SelfInheritanceCell = () => {
  return (
    <td>
      <div
        className="size-8 rounded-secondary bg-neutral-800"
        title={SELF_INHERITANCE_TITLE}
      />
    </td>
  );
};
