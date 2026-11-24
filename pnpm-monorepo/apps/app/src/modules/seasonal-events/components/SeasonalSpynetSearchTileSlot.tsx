import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The dashboard renders the slot next to the tile, inside a box of the same
 * size, because the SpyNet page shows the same tile without a decoration.
 *
 * A decoration places its parts absolutely: the box of the slot is the tile,
 * and nothing clips it, thus a part can also stand on the upper edge of the
 * tile.
 */
export const SeasonalSpynetSearchTileSlot = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { SpynetSearchTileDecoration } = resolution.theme;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden lg:block"
    >
      <SpynetSearchTileDecoration />
    </div>
  );
};
