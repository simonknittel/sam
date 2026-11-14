import clsx from "clsx";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LiveStatusSince } from "./LiveStatusSince";
import { LiveStatusUncertainLabel } from "./LiveStatusUncertainLabel";

interface Props {
  readonly icon: IconType;
  readonly label: string;
  /** Null when the label alone tells the state, for example a zone */
  readonly value?: string | null;
  /** The full text on hover, when it holds more than the row */
  readonly title?: string;
  readonly since: Date | null;
  readonly now: Date;
  readonly isUncertain?: boolean;
  /** Details below the row */
  readonly children?: ReactNode;
}

/** One line of a reporter in the Live-Status, for example "Shard: EU 100" */
export const LiveStatusRow = ({
  icon: Icon,
  label,
  value = null,
  title,
  since,
  now,
  isUncertain = false,
  children,
}: Props) => (
  <li className={clsx({ "opacity-60": isUncertain })}>
    <div className="flex items-center gap-2">
      <Icon className="shrink-0 text-white/40" aria-hidden />
      <span
        className="min-w-0 flex-1 truncate"
        title={title ?? (value ? `${label}: ${value}` : label)}
      >
        <span className="font-mono text-white/40 uppercase">
          {label}
          {value && ":"}
        </span>
        {value && ` ${value}`}
      </span>
      {isUncertain && <LiveStatusUncertainLabel />}
      {since && <LiveStatusSince since={since} now={now} />}
    </div>

    {children}
  </li>
);
