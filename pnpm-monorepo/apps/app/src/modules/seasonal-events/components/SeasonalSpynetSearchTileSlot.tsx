import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The decoration of the SpyNet search tile of the dashboard for the active
 * seasonal event, or nothing. The dashboard renders the slot next to the
 * tile, inside a box of the same size, because the SpyNet page shows the
 * same tile without a decoration.
 *
 * The slot lies above the whole tile and takes no space in it, thus the
 * content of the tile keeps its position. A decoration places its parts
 * absolutely: the box of the slot is the tile, and nothing clips it, thus a
 * part can also stand on the upper edge of the tile. Like the top bar, the
 * slot shows on large viewports only.
 */
export const SeasonalSpynetSearchTileSlot = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { SpynetSearchTileDecoration } = resolution.theme;

  return (
    <div
      aria-hidden
      className="hidden lg:block absolute inset-0 pointer-events-none"
    >
      <SpynetSearchTileDecoration />
    </div>
  );
};
