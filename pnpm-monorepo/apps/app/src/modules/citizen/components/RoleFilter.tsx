"use client";

import { FilterCheckboxList } from "@/modules/common/components/FilterCheckboxList";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import { type Role, type Upload } from "@sam-monorepo/database/browser";
import Image from "next/image";

interface Props {
  readonly roles: (Role & {
    icon: Upload | null;
  })[];
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
              <div className="aspect-square w-6 h-6 flex items-center justify-center rounded-secondary overflow-hidden">
                <Image
                  src={getPublicUploadUrl(role.icon.id)}
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

            {role.name}
          </>
        ),
      }))}
    />
  );
};
