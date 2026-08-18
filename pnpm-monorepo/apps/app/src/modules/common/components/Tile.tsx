import clsx from "clsx";
import type { ReactNode } from "react";

export enum TileVariant {
  Default = "default",
  /** Destructive actions, e.g. a danger zone */
  Danger = "danger",
  /** Content which is specific to the viewer */
  Me = "me",
}

interface Props {
  readonly className?: string;
  /** Omitted on tiles whose page already names their content, e.g. the system log */
  readonly heading?: ReactNode;
  readonly subheading?: ReactNode;
  readonly cta?: ReactNode;
  readonly children: ReactNode;
  readonly childrenClassName?: string;
  readonly variant?: TileVariant;
}

export const Tile = ({
  className,
  cta,
  heading,
  subheading,
  children,
  childrenClassName,
  variant = TileVariant.Default,
}: Props) => {
  return (
    <section
      className={clsx(
        "corners-primary",
        {
          "bg-secondary": variant === TileVariant.Default,
          "tile-accent-surface": variant !== TileVariant.Default,
          "[--tile-accent-color:var(--color-red-500)]":
            variant === TileVariant.Danger,
          "[--tile-accent-color:var(--color-me)]": variant === TileVariant.Me,
        },
        className,
      )}
    >
      {(heading || cta) && (
        <div
          className={clsx("flex justify-between items-center border-b", {
            "border-white/5": variant === TileVariant.Default,
            "border-red-500/30": variant === TileVariant.Danger,
            "border-me/30": variant === TileVariant.Me,
          })}
        >
          <div className="flex-1 p-4">
            {heading && (
              <h2
                className={clsx("font-bold text-lg font-mono uppercase", {
                  "text-red-500": variant === TileVariant.Danger,
                  "text-me": variant === TileVariant.Me,
                })}
              >
                {heading}
              </h2>
            )}

            {subheading && (
              <p className="mt-1 text-neutral-500 text-sm">{subheading}</p>
            )}
          </div>

          {cta && <div className="pr-4 flex-initial">{cta}</div>}
        </div>
      )}

      <div className={clsx("p-4", childrenClassName)}>{children}</div>
    </section>
  );
};
