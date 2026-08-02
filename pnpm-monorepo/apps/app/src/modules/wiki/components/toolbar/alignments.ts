"use client";

import {
  WIKI_NARROW_WIDTH_PX,
  WIKI_WIDE_WIDTH_PX,
  type WikiNodeAlignment,
} from "@sam-monorepo/wiki-editor";
import { FaAlignCenter, FaAlignLeft, FaAlignRight } from "react-icons/fa";
import {
  MdAlignHorizontalCenter,
  MdAlignHorizontalLeft,
  MdAlignHorizontalRight,
  MdOutlineWidthFull,
  MdOutlineWidthNormal,
  MdOutlineWidthWide,
} from "react-icons/md";

/** Text alignment (the `textAlign` attribute of paragraphs/headings) */
export const ALIGNMENT_OPTIONS: readonly {
  value: WikiNodeAlignment;
  title: string;
  icon: typeof FaAlignLeft;
}[] = [
  { value: "left", title: "Linksbündig", icon: FaAlignLeft },
  { value: "center", title: "Zentriert", icon: FaAlignCenter },
  { value: "right", title: "Rechtsbündig", icon: FaAlignRight },
];

/**
 * Block position (the margin-based `align` attribute of resizable
 * blocks) — distinct icons from the text alignment above, since the
 * paragraph/heading menu offers both groups side by side.
 */
export const BLOCK_ALIGNMENT_OPTIONS: readonly {
  value: WikiNodeAlignment;
  title: string;
  icon: typeof MdAlignHorizontalLeft;
}[] = [
  {
    value: "left",
    title: "Block links positionieren",
    icon: MdAlignHorizontalLeft,
  },
  {
    value: "center",
    title: "Block zentrieren",
    icon: MdAlignHorizontalCenter,
  },
  {
    value: "right",
    title: "Block rechts positionieren",
    icon: MdAlignHorizontalRight,
  },
];

/**
 * Width presets setting the `widthPx` attribute. NULL stands for the full
 * column width (stored as WIKI_FULL_WIDTH); the narrow preset is the
 * schema default.
 */
export const WIDTH_PRESET_OPTIONS: readonly {
  title: string;
  widthPx: number | null;
  icon: typeof MdOutlineWidthNormal;
}[] = [
  {
    title: `Schmal (${WIKI_NARROW_WIDTH_PX}px)`,
    widthPx: WIKI_NARROW_WIDTH_PX,
    icon: MdOutlineWidthNormal,
  },
  {
    title: `Breit (${WIKI_WIDE_WIDTH_PX}px)`,
    widthPx: WIKI_WIDE_WIDTH_PX,
    icon: MdOutlineWidthWide,
  },
  { title: "Volle Breite", widthPx: null, icon: MdOutlineWidthFull },
];
