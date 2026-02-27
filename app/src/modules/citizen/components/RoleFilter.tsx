"use client";

import { env } from "@/env";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { type Role, type Upload } from "@prisma/client";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEventHandler } from "react";

interface Props {
  readonly roles: (Role & {
    icon: Upload | null;
  })[];
}

export const RoleFilter = ({ roles }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultValues =
    searchParams
      .get("filters")
      ?.split(",")
      .filter((filter) => filter.startsWith("role-")) || [];

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearchParams = new URLSearchParams(window.location.search);

    let filters = newSearchParams.get("filters")?.split(",") || [];

    if (event.target.checked) {
      filters.push(event.target.value);
    } else {
      filters = filters.filter((filter) => filter !== event.target.value);
    }

    newSearchParams.set("filters", filters.join(","));

    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-2 rounded-secondary bg-neutral-800 max-h-96 overflow-auto">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex justify-between items-center w-full gap-4"
        >
          <label className="flex gap-2 items-center whitespace-nowrap">
            {role.icon && (
              <div className="aspect-square w-6 h-6 flex items-center justify-center rounded-secondary overflow-hidden">
                <Image
                  src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${role.icon.id}`}
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
          </label>

          <YesNoCheckbox
            id={role.id}
            value={`role-${role.id}`}
            onChange={handleChange}
            defaultChecked={defaultValues.includes(`role-${role.id}`)}
            hideLabel
          />
        </div>
      ))}
    </div>
  );
};
