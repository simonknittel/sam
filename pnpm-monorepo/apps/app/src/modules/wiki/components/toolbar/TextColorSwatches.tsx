"use client";

import {
  WIKI_COLOR_LABELS,
  WIKI_TEXT_COLORS,
  type WikiTextColor,
} from "@sam-monorepo/wiki-editor";
import clsx from "clsx";

/* Same 400 shades the wikiTextColor mark resolves to (wikiEditor.css) */
const COLOR_CLASSES: Record<WikiTextColor, string> = {
  yellow: "text-yellow-400",
  green: "text-green-400",
  blue: "text-blue-400",
  red: "text-red-400",
  purple: "text-purple-400",
};

interface Props {
  /** Highlights the given color; omit when no text color is active */
  readonly activeColor?: WikiTextColor | null;
  readonly onSelect: (color: WikiTextColor) => void;
}

/**
 * The text color swatch row of the contextual edit menu. Swatches preview
 * the mark itself — a colored "A" on the popover background — which also
 * tells them apart from the marker swatches (colored background, see
 * HighlightSwatches).
 */
export const TextColorSwatches = ({ activeColor = null, onSelect }: Props) => {
  return (
    <>
      {WIKI_TEXT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={WIKI_COLOR_LABELS[color]}
          onClick={() => onSelect(color)}
          className={clsx(
            "flex size-6 cursor-pointer items-center justify-center rounded-secondary border text-sm font-bold",
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
