"use client";

import type { VariantCatalogTag } from "@/modules/fleet/queries/getVariantCatalog";
import clsx from "clsx";

interface Props {
  readonly tag: VariantCatalogTag;
  /** Whether the tag filters the list */
  readonly isPressed: boolean;
  readonly onClick: (tag: VariantCatalogTag) => void;
}

/** Looks like `RoleTagChip`, with the key of the tag before its value */
export const VariantTagChip = ({ tag, isPressed, onClick }: Props) => {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      // The flex layout drops the space between the key and the value
      aria-label={`${tag.key}: ${tag.value}`}
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
      <span className="opacity-60">{tag.key}:</span>
      {tag.value}
    </button>
  );
};
