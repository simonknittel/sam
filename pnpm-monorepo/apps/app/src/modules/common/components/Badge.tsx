import clsx from "clsx";
import { type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly label: string;
  readonly value: string;
  readonly valueNode?: ReactNode;
  readonly showLabel?: boolean;
  readonly icon?: ReactNode;
  readonly cta?: ReactNode;
}

export const Badge = ({
  className,
  label,
  value,
  valueNode,
  showLabel,
  icon,
  cta,
}: Props) => {
  return (
    <div
      className={clsx(
        "rounded-secondary bg-neutral-700/50 px-2 py-1 inline-flex gap-2 items-center overflow-hidden",
        className,
      )}
      title={`${label}: ${value}`}
    >
      {icon && <span className="text-xs opacity-30">{icon}</span>}

      <div className="flex flex-col">
        <span
          className={clsx("text-xs opacity-30 truncate font-mono uppercase", {
            "sr-only": !showLabel,
          })}
        >
          {label}
        </span>

        <span className="truncate">{valueNode || value}</span>
      </div>

      {cta && <span className="text-xs">{cta}</span>}
    </div>
  );
};
