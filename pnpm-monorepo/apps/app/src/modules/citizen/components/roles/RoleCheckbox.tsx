"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { clsx } from "clsx";
import type { FuseResultMatch } from "fuse.js";
import Image from "next/image";
import { useId } from "react";

interface Props {
  readonly role: BadgeRole;
  readonly isChecked?: boolean;
  readonly isVisible?: boolean;
  readonly match?: FuseResultMatch;
  readonly query?: string;
}

export const RoleCheckbox = ({
  role,
  isChecked = false,
  isVisible = true,
  match,
  query,
}: Readonly<Props>) => {
  const authentication = useAuthentication();
  const id = useId();

  let disabled = false;

  if (
    isChecked &&
    (!authentication ||
      !authentication.authorize("otherRole", "dismiss", [
        {
          key: "roleId",
          value: role.id,
        },
      ]))
  )
    disabled = true;

  if (
    !isChecked &&
    (!authentication ||
      !authentication.authorize("otherRole", "assign", [
        {
          key: "roleId",
          value: role.id,
        },
      ]))
  )
    disabled = true;

  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex cursor-pointer break-inside-avoid-column items-center justify-between rounded-secondary p-2 focus-within:bg-neutral-900 hover:bg-neutral-900",
        !isVisible && "hidden",
      )}
    >
      <span className="flex items-center gap-2 overflow-hidden">
        {role.icon && (
          <div className="flex aspect-square size-6 flex-none items-center justify-center overflow-hidden rounded-secondary">
            <Image
              src={getPublicUploadUrl(role.icon.id)}
              alt=""
              width={24}
              height={24}
              className="max-h-full max-w-full"
              unoptimized={["image/svg+xml", "image/gif"].includes(
                role.icon.mimeType,
              )}
              loading="lazy"
            />
          </div>
        )}

        <span className="truncate" title={role.name}>
          {query && match
            ? underlineCharacters(role.name, match.indices)
            : role.name}
        </span>
      </span>

      <YesNoCheckbox
        name={`role_${role.id}`}
        disabled={disabled}
        hideLabel
        defaultChecked={isChecked}
        id={id}
      />
    </label>
  );
};
