import { env } from "@/env";
import type { Upload } from "@prisma/client";
import { type Role } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly role: Role & {
    icon: Upload | null;
  };
  readonly showPlaceholder?: boolean;
}

export const SingleRole = ({
  className,
  role,
  showPlaceholder = false,
}: Props) => {
  return (
    <span
      className={clsx(
        "px-2 py-1 rounded-secondary bg-neutral-700/50 inline-flex align-middle gap-2 items-center overflow-hidden",
        className,
      )}
    >
      {role.icon && (
        <span className="aspect-square size-6 flex items-center justify-center">
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
        </span>
      )}

      {!role.iconId && showPlaceholder && <span className="size-6" />}

      <span className="overflow-hidden whitespace-nowrap text-ellipsis">
        {role.name}
      </span>
    </span>
  );
};
