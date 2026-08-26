import { Link } from "@/modules/common/components/Link";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import Image from "next/image";
import type { ComponentProps } from "react";

interface Props {
  readonly role: Pick<Role, "id" | "name"> & {
    readonly icon: Pick<Upload, "id" | "mimeType"> | null;
  };
  readonly href: ComponentProps<typeof Link>["href"];
}

/**
 * The first cell of a matrix row: the role the row belongs to, linking to
 * the page which edits the same data one role at a time. The cell stays put
 * while the matrix scrolls sideways, so the row keeps its name whichever
 * column is in view.
 */
export const MatrixRoleCell = ({ role, href }: Props) => {
  return (
    <td className="h-8 overflow-hidden sticky -left-2 z-10 bg-secondary rounded-secondary">
      <Link
        href={href}
        className="flex items-center gap-2 px-2 rounded-secondary h-full hover:bg-neutral-800 focus-visible:bg-neutral-800 active:bg-neutral-600"
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
  );
};
