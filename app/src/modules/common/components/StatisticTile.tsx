import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly children: ReactNode;
  readonly label: ReactNode;
  readonly preLabel?: ReactNode;
}

export const StatisticTile = ({
  className,
  children,
  label,
  preLabel,
}: Props) => {
  return (
    <div
      className={clsx(
        "rounded-primary background-secondary p-4 flex flex-col items-center text-center",
        className,
      )}
    >
      <p className="text-neutral-500">{preLabel}</p>
      <span className="font-black text-4xl font-mono uppercase">
        {children}
      </span>
      <p className="text-neutral-500">{label}</p>
    </div>
  );
};
