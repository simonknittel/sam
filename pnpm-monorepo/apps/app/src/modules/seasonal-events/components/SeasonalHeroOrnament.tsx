import clsx from "clsx";
import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

interface Props {
  /** Sizes the ornament, and positions it if the caller needs that */
  readonly className?: string;
}

/**
 * The ornament of the active seasonal event, or nothing. The greeting banner
 * is the only caller: it puts the ornament next to the greeting.
 *
 * The caller gives the ornament its box; the drawing fills that box. The
 * ornament stays on every viewport size, because it moves nothing and is the
 * only decoration which small screens also show.
 *
 * The ornament lies over the banner and rises above its upper edge, thus it
 * lets every pointer through: a click or a drag of text over the drawing must
 * reach what lies beneath it.
 */
export const SeasonalHeroOrnament = async ({ className }: Props) => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { HeroOrnament } = resolution.theme;

  return (
    <div aria-hidden className={clsx("pointer-events-none", className)}>
      <HeroOrnament className="size-full" />
    </div>
  );
};
