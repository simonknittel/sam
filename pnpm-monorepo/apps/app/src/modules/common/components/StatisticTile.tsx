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
        "flex flex-col items-center justify-center rounded-primary bg-secondary p-4 text-center",
        className,
      )}
    >
      <p className="text-white/20">{preLabel}</p>
      <span className="font-mono text-4xl font-black uppercase">
        {children}
      </span>
      <p className="text-white/20">{label}</p>
    </div>
  );
};
