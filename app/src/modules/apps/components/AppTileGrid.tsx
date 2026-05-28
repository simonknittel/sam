import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
  readonly variant?: "default" | "compact";
}

export const AppTileGrid = ({
  className,
  children,
  variant = "default",
}: Props) => {
  return (
    <div
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
    </div>
  );
};
