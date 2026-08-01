"use client";

import {
  WIKI_COLOR_LABELS,
  WIKI_HIGHLIGHT_COLORS,
  type WikiHighlightColor,
} from "@sam-monorepo/wiki-editor";
import clsx from "clsx";

/* Same 40% 500 shades the highlight mark resolves to (wikiEditor.css) */
const COLOR_CLASSES: Record<WikiHighlightColor, string> = {
  yellow: "bg-yellow-500/40",
  green: "bg-green-500/40",
  blue: "bg-blue-500/40",
  red: "bg-red-500/40",
  purple: "bg-purple-500/40",
};

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
          key={color}
          type="button"
          title={WIKI_COLOR_LABELS[color]}
          onClick={() => onSelect(color)}
          className={clsx(
            "flex size-6 cursor-pointer items-center justify-center rounded-secondary border text-sm font-bold text-neutral-50",
            COLOR_CLASSES[color],
            {
              "border-neutral-50": activeColor === color,
              "border-neutral-700": activeColor !== color,
            },
          )}
        >
          A
        </button>
      ))}
    </>
  );
};
