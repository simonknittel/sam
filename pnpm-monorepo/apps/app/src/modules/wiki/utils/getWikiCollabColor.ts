/**
 * Presence colors, evenly spaced hues at 70% saturation and 50% lightness.
 * They must be 6-digit hex: y-prosemirror's defaultSelectionBuilder styles
 * selections with `background-color: ${color}70`, appending a hex alpha
 * channel to the raw color string.
 */
const PALETTE = [
  "#d92626",
  "#d97f26",
  "#d9d926",
  "#7fd926",
  "#26d926",
  "#26d97f",
  "#26d9d9",
  "#267fd9",
  "#2626d9",
  "#7f26d9",
  "#d926d9",
  "#d9267f",
];

/**
 * Deterministic presence caret color per user, derived from their id.
 */
export const getWikiCollabColor = (seed: string) => {
  let hash = 0;
  for (const character of seed)
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 360;

  return PALETTE[hash % PALETTE.length];
};
