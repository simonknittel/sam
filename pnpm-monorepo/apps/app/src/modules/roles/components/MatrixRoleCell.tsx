import { Link } from "@/modules/common/components/Link";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { Role, Upload } from "@sam-monorepo/database/browser";
import type { ComponentProps } from "react";

interface Props {
  readonly role: Pick<Role, "id" | "name"> & {
    readonly icon: Pick<Upload, "id" | "mimeType"> | null;
  };
  readonly href: ComponentProps<typeof Link>["href"];
}

export const MatrixRoleCell = ({ role, href }: Props) => {
  return (
    <td className="sticky -left-2 z-10 h-8 overflow-hidden rounded-secondary bg-secondary">
      <Link
        href={href}
        className="flex h-full items-center gap-2 rounded-secondary px-2 hover:bg-neutral-800 focus-visible:bg-neutral-800 active:bg-neutral-600"
        prefetch={false}
      >
        {role.icon ? (
          <div className="flex aspect-square size-4 flex-none items-center justify-center overflow-hidden rounded-secondary">
            <UploadedIcon upload={role.icon} size={UploadedIconSize.Small} />
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
