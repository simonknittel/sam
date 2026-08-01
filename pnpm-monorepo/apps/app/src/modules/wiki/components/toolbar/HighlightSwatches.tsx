"use client";

import { WIKI_HIGHLIGHT_COLORS } from "@sam-monorepo/wiki-editor";
import clsx from "clsx";

export type WikiHighlightColor =
  (typeof WIKI_HIGHLIGHT_COLORS)[number]["value"];

interface Props {
  /** Highlights the given color; omit when no highlight is active */
  readonly activeColor?: WikiHighlightColor | null;
  readonly onSelect: (color: WikiHighlightColor) => void;
}

/**
 * The highlight swatch row of the contextual edit menu. Swatches preview
 * the mark itself — an "A" in regular text color on the highlight
 * background — which also tells them apart from the text color swatches
 * (colored "A", see TextColorSwatches).
 */
export const HighlightSwatches = ({ activeColor = null, onSelect }: Props) => {
  return (
    <>
      {WIKI_HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.name}
          onClick={() => onSelect(color.value)}
          className={clsx(
            "flex size-6 cursor-pointer items-center justify-center rounded-secondary border text-sm font-bold text-neutral-50",
            {
              "border-neutral-50": activeColor === color.value,
              "border-neutral-700": activeColor !== color.value,
            },
          )}
          style={{ backgroundColor: color.value }}
        >
          A
        </button>
      ))}
    </>
  );
};
