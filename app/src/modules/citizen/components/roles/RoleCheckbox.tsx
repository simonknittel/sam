"use client";

import { env } from "@/env";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import { type Role, type Upload } from "@prisma/client";
import { clsx } from "clsx";
import type { FuseResultMatch } from "fuse.js";
import Image from "next/image";
import { useId } from "react";

interface Props {
  readonly role: Role & { icon: Upload | null };
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
        "p-2 flex justify-between items-center break-inside-avoid-column cursor-pointer hover:bg-neutral-900 focus-within:bg-neutral-900 rounded-secondary",
        !isVisible && "hidden",
      )}
    >
      <span className="flex gap-2 items-center overflow-hidden">
        {role.icon && (
          <div className="flex-none aspect-square w-6 h-6 flex items-center justify-center rounded-secondary overflow-hidden">
            <Image
              src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${role.icon.id}`}
              alt=""
              width={24}
              height={24}
              className="max-w-full max-h-full"
              unoptimized={["image/svg+xml", "image/gif"].includes(
                role.icon.mimeType,
              )}
              loading="lazy"
            />
          </div>
        )}

        <span className="truncate">
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
