"use client";

import type { BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import clsx from "clsx";
import { UploadedIcon, UploadedIconSize } from "./UploadedIcon";

interface Props {
  readonly tag: BadgeRoleTag;
  /**
   * Whether the tag filters the list (single mode). Undefined in multiple
   * mode: there, a click adds the roles of the tag.
   */
  readonly isPressed?: boolean;
  /** Disables the tag. The title gives this reason. */
  readonly disabledReason?: string;
  readonly onClick: (tagId: BadgeRoleTag["id"]) => void;
}

export const RoleTagChip = ({
  tag,
  isPressed,
  disabledReason,
  onClick,
}: Props) => {
  const isDisabled = disabledReason !== undefined;

  return (
    <button
      type="button"
      aria-pressed={isPressed}
      aria-disabled={isDisabled || undefined}
      title={disabledReason ?? tag.description ?? undefined}
      onClick={() => {
        if (!isDisabled) onClick(tag.id);
      }}
      className={clsx(
        "inline-flex min-h-7 items-center gap-1 rounded-secondary border px-2 py-0.5 text-left font-mono text-xs outline-offset-2 outline-interaction-700 focus-visible:outline-2",
        {
          "border-neutral-700": !isPressed,
          "hover:border-neutral-500 hover:bg-neutral-800 active:bg-neutral-700":
            !isPressed && !isDisabled,
          "border-interaction-500 bg-interaction-500/20 text-interaction-300 hover:bg-interaction-500/30 active:bg-interaction-500/10":
            isPressed,
          "cursor-pointer": !isDisabled,
          "cursor-not-allowed opacity-50": isDisabled,
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
