"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import Image from "next/image";

interface Props {
  readonly roles: readonly BadgeRole[];
}

export const RoleFilter = ({ roles }: Props) => {
  return (
    <FilterCheckboxList
      className="max-h-96 overflow-auto"
      prefix="role"
      items={roles.map((role) => ({
        id: role.id,
        label: (
          <>
            {role.icon && (
              <div className="flex aspect-square h-6 w-6 items-center justify-center overflow-hidden rounded-secondary">
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

            {role.name}
          </>
        ),
      }))}
    />
  );
};
