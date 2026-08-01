"use client";

import {
  WIKI_TEXT_COLORS,
  type WikiTextColor,
} from "@sam-monorepo/wiki-editor";
import clsx from "clsx";

/* Same 400 shades the wikiTextColor mark resolves to (wikiEditor.css) */
const COLOR_CLASSES: Record<WikiTextColor, string> = {
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  red: "bg-red-400",
  purple: "bg-purple-400",
};

const COLOR_LABELS: Record<WikiTextColor, string> = {
  yellow: "Gelb",
  green: "Grün",
  blue: "Blau",
  red: "Rot",
  purple: "Lila",
};

interface Props {
  /** Highlights the given color; omit when no text color is active */
  readonly activeColor?: WikiTextColor | null;
  readonly onSelect: (color: WikiTextColor) => void;
}

/**
 * The text color swatch row shared by the toolbar's TextColorPicker and
 * the contextual edit menu.
 */
export const TextColorSwatches = ({ activeColor = null, onSelect }: Props) => {
  return (
    <>
      {WIKI_TEXT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={COLOR_LABELS[color]}
          onClick={() => onSelect(color)}
          className={clsx(
            "size-6 cursor-pointer rounded-secondary border",
            COLOR_CLASSES[color],
            {
              "border-neutral-50": activeColor === color,
              "border-neutral-700": activeColor !== color,
            },
          )}
        />
      ))}
    </>
  );
};
