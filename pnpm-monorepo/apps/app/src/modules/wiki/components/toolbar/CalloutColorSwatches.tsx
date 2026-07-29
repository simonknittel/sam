"use client";

import {
  WIKI_CALLOUT_COLORS,
  type WikiCalloutColor,
} from "@sam-monorepo/wiki-editor";
import clsx from "clsx";

const COLOR_CLASSES: Record<WikiCalloutColor, string> = {
  neutral: "bg-neutral-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const COLOR_LABELS: Record<WikiCalloutColor, string> = {
  neutral: "Neutral",
  blue: "Blau",
  green: "Grün",
  yellow: "Gelb",
  red: "Rot",
};

interface Props {
  /** Highlights the given color; omit when no callout is active */
  readonly activeColor?: WikiCalloutColor | null;
  readonly onSelect: (color: WikiCalloutColor) => void;
}

/**
 * The callout color swatch row shared by the toolbar's CalloutPicker and
 * the contextual edit menu.
 */
export const CalloutColorSwatches = ({
  activeColor = null,
  onSelect,
}: Props) => {
  return (
    <>
      {WIKI_CALLOUT_COLORS.map((color) => (
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
