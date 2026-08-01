/**
 * Named color tokens shared by the inline color marks (wikiTextColor,
 * highlight). Documents store the token, never a concrete color — the
 * mapping to theme colors happens in CSS (the app's wikiEditor.css), so
 * stored content stays independent of the theme's color values.
 */
export const WIKI_COLOR_TOKENS = [
  "yellow",
  "green",
  "blue",
  "red",
  "purple",
] as const;
export type WikiColorToken = (typeof WIKI_COLOR_TOKENS)[number];

/** German labels shown wherever the tokens are offered */
export const WIKI_COLOR_LABELS: Record<WikiColorToken, string> = {
  yellow: "Gelb",
  green: "Grün",
  blue: "Blau",
  red: "Rot",
  purple: "Lila",
};
