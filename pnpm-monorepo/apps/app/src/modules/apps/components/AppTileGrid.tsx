import clsx from "clsx";
import type { ReactNode } from "react";

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
