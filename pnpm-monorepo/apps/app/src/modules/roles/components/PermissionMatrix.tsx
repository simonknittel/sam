import { Link } from "@/modules/common/components/Link";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { PermissionString } from "@sam-monorepo/database/client";
import clsx from "clsx";
import Image from "next/image";
import {
  getRolesWithPermissionStrings,
  type BadgeRole,
} from "../queries/getRoles";
import { STATIC_PERMISSIONS } from "../utils/STATIC_PERMISSIONS";
import { PermissionCheckbox } from "./PermissionCheckbox";
import { PermissionMatrixForm } from "./PermissionMatrixForm";
import { PermissionsProvider } from "./PermissionsContext";

interface Props {
  readonly className?: string;
}

export const PermissionMatrix = async ({ className }: Props) => {
  const roles = await getRolesWithPermissionStrings();

  /**
   * Sorted here rather than while rendering the header, so the columns and
   * every row agree on the order without mutating the shared constant.
   */
  const permissions = STATIC_PERMISSIONS.toSorted((a, b) =>
    a.section.localeCompare(b.section),
  );

  const gridTemplateColumns = `240px repeat(${permissions.length}, 32px)`;

  return (
    <section
      className={clsx(
        "p-4 lg:p-6 rounded-primary bg-secondary overflow-x-scroll",
        className,
      )}
    >
      <PermissionMatrixForm>
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
              <Row
                key={role.id}
                role={role}
                permissions={permissions}
                gridTemplateColumns={gridTemplateColumns}
              />
            ))}
          </tbody>
        </table>
      </PermissionMatrixForm>
    </section>
  );
};

interface RowProps {
  readonly role: BadgeRole & {
    readonly permissionStrings: readonly Pick<
      PermissionString,
      "permissionString"
    >[];
  };
  readonly permissions: typeof STATIC_PERMISSIONS;
  readonly gridTemplateColumns: string;
}

const Row = ({ role, permissions, gridTemplateColumns }: RowProps) => {
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

      <PermissionsProvider role={role}>
        {permissions.map((permission) => (
          <PermissionCheckbox
            key={`${role.id}_${permission.string}`}
            roleId={role.id}
            permissionString={permission.string}
          />
        ))}
      </PermissionsProvider>
    </tr>
  );
};
