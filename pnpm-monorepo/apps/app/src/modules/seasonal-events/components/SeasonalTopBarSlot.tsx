import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The decoration of the top bar of the active seasonal event, or nothing.
 *
 * The slot lies above the whole bar and takes no space in it, thus the
 * content of the bar keeps its position. A decoration places its parts
 * absolutely: the box of the slot is the bar itself, and nothing clips it,
 * thus a part can also hang below the bar. The slot needs no breakpoint of
 * its own, because the top bar exists on large viewports only.
 */
export const SeasonalTopBarSlot = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { TopBarDecoration } = resolution.theme;

  return (
    <div
      aria-hidden
      // `ViewportCornerWeb` reads this attribute to hide the web of the layer
      data-seasonal-top-bar
      className="absolute inset-0 pointer-events-none"
    >
      <TopBarDecoration />
    </div>
  );
};
