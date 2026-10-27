import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly tag: Pick<BadgeRoleTag, "name" | "description" | "icon">;
}

/**
 * A tag as a label, with the look of the tags of the role picker. The title
 * gives the full name and the description.
 */
export const RoleTagBadge = ({ className, tag }: Props) => {
  return (
    <span
      title={tag.description ? `${tag.name}\n${tag.description}` : tag.name}
      className={clsx(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-secondary border border-neutral-700 px-2 font-mono text-xs",
        className,
      )}
    >
      {tag.icon && (
        <span className="flex size-4 flex-none items-center justify-center">
          <UploadedIcon upload={tag.icon} size={UploadedIconSize.Small} />
        </span>
      )}

      <span className="truncate">{tag.name}</span>
    </span>
  );
};
