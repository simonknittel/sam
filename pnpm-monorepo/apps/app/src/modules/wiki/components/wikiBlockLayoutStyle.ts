import { clampWikiWidthPx } from "@sam-monorepo/wiki-editor";
import type { CSSProperties } from "react";

/**
 * Inline styles mirroring the `widthPx`/`align` attributes' renderHTML,
 * for the React node views and static node mappings that build their DOM
 * themselves — there the schema's attribute styles are not applied
 * automatically. A NULL align means centered; a non-number width
 * (WIKI_FULL_WIDTH or NULL) renders no width.
 */
export const wikiBlockLayoutStyle = (
  attrs: Readonly<Record<string, unknown>>,
): CSSProperties => {
  const style: CSSProperties = {
    marginLeft: attrs.align === "left" ? 0 : "auto",
    marginRight: attrs.align === "right" ? 0 : "auto",
  };
  if (typeof attrs.widthPx === "number") {
    style.width = clampWikiWidthPx(attrs.widthPx);
    style.maxWidth = "100%";
  }
  return style;
};

/**
 * Same idea for the floated image's `floatSide`/`widthPx` attributes: the
 * float side instead of the block-position margins. The max-width caps the
 * image at the paragraph it floats in.
 */
export const wikiFloatImageStyle = (
  attrs: Readonly<Record<string, unknown>>,
): CSSProperties => {
  const style: CSSProperties = {
    float: attrs.floatSide === "right" ? "right" : "left",
  };
  if (typeof attrs.widthPx === "number") {
    style.width = clampWikiWidthPx(attrs.widthPx);
    style.maxWidth = "100%";
  }
  return style;
};
