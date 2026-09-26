import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The width of one tile in the default grid, for the `sizes` of its
 * screenshot. Keep the breakpoints the same as the columns below. The
 * fractions of the viewport ignore the padding and the gaps, thus they are a
 * little wider than a tile. From the 3xl breakpoint, the page content stops
 * at 1920 px (see MaxWidthContent), thus a tile is never wider than 302 px.
 */
export const APP_TILE_IMAGE_SIZES =
  "(min-width: 1920px) 302px, (min-width: 96rem) 20vw, (min-width: 80rem) 25vw, (min-width: 40rem) 33vw, 50vw";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
  readonly variant?: "default" | "compact";
}

/**
 * A list of apps, so every tile is addressable as one item — the tiles are
 * containers rather than single links (see AppTile).
 */
export const AppTileGrid = ({
  className,
  children,
  variant = "default",
}: Props) => {
  return (
    <ul
      className={clsx(
        "grid",
        {
          "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4":
            variant === "default",
          "grid-cols-2 gap-0.5": variant === "compact",
        },
        className,
      )}
    >
      {children}
    </ul>
  );
};
