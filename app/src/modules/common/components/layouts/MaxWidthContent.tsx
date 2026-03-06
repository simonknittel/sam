import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
  readonly maxWidth?: "screen-3xl" | "prose";
}

export const MaxWidthContent = ({
  className,
  children,
  maxWidth = "screen-3xl",
}: Props) => {
  return (
    <div
      className={clsx("mx-auto p-4", className, {
        "max-w-(--breakpoint-3xl)": maxWidth === "screen-3xl",
        "max-w-prose": maxWidth === "prose",
      })}
    >
      {children}
    </div>
  );
};
