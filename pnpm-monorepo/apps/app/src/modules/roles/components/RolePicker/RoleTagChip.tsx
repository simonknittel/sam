"use client";

import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import clsx from "clsx";

interface Props {
  readonly tag: BadgeRoleTag;
  /** Whether the tag filters the list */
  readonly isPressed: boolean;
  readonly onClick: (tag: BadgeRoleTag) => void;
}

export const RoleTagChip = ({ tag, isPressed, onClick }: Props) => {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      title={tag.description ?? undefined}
      onClick={() => onClick(tag)}
      className={clsx(
        "inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-secondary border px-2 py-0.5 text-left font-mono text-xs outline-offset-2 outline-interaction-700 focus-visible:outline-2",
        {
          "border-white/20 hover:border-white/40 hover:bg-white/10 active:bg-white/20":
            !isPressed,
          "border-interaction-500 bg-interaction-500/20 text-interaction-300 hover:bg-interaction-500/30 active:bg-interaction-500/10":
            isPressed,
        },
      )}
    >
      {tag.icon && (
        <span className="flex size-4 flex-none items-center justify-center">
          <UploadedIcon upload={tag.icon} size={UploadedIconSize.Small} />
        </span>
      )}

      {tag.name}
    </button>
  );
};
