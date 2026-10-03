import clsx from "clsx";
import { type ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly label: string;
  readonly value: string;
  readonly showLabel?: boolean;
  readonly icon?: ReactNode;
  readonly cta?: ReactNode;
}

export const Badge = ({
  className,
  label,
  value,
  showLabel,
  icon,
  cta,
}: Props) => {
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 overflow-hidden rounded-secondary bg-neutral-700/50 px-2 py-1",
        className,
      )}
      title={`${label}: ${value}`}
    >
      {icon && <span className="text-xs opacity-30">{icon}</span>}

      <div className="flex flex-col">
        <span
          className={clsx("truncate font-mono text-xs uppercase opacity-30", {
            "sr-only": !showLabel,
          })}
        >
          {label}
        </span>

        <span className="truncate">{value}</span>
      </div>

      {cta && <span className="text-xs">{cta}</span>}
    </div>
  );
};
