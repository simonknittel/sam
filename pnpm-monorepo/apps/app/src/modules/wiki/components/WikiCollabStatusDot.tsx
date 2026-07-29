"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { WebSocketStatus } from "@hocuspocus/provider";
import clsx from "clsx";

const STATUS_CONFIG: Record<
  WebSocketStatus,
  { label: string; solidClassName: string; pingClassName: string }
> = {
  [WebSocketStatus.Connected]: {
    label: "Verbunden",
    solidClassName: "bg-green-500",
    pingClassName: "bg-green-500",
  },
  [WebSocketStatus.Connecting]: {
    label: "Verbindet …",
    solidClassName: "bg-blue-500",
    pingClassName: "bg-blue-500",
  },
  [WebSocketStatus.Disconnected]: {
    label: "Getrennt",
    solidClassName: "bg-red-500",
    pingClassName: "bg-red-500",
  },
};

export interface WikiCollabUser {
  readonly name: string;
  readonly color: string;
}

interface Props {
  readonly className?: string;
  readonly status: WebSocketStatus;
  /** Connected collaborators (from the provider's awareness states) */
  readonly users: readonly WikiCollabUser[];
}

/**
 * Pinging connection indicator of the collaborative editor (green:
 * connected, blue: connecting, red: disconnected), like the dot badge on
 * the app tiles, plus the number of connected users. The popover explains
 * the state and lists the users by name.
 */
export const WikiCollabStatusDot = ({ className, status, users }: Props) => {
  const config = STATUS_CONFIG[status];
  const showUsers = status === WebSocketStatus.Connected && users.length > 0;

  return (
    <span className={clsx("flex items-center", className)}>
      <PopoverBaseUI
        hoverOnly
        trigger={
          <span className="flex cursor-help items-center gap-1.5 p-1">
            <span
              className="relative flex size-2"
              role="status"
              aria-label={config.label}
            >
              <span
                className={clsx(
                  "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping motion-reduce:hidden",
                  config.pingClassName,
                )}
              />
              <span
                className={clsx(
                  "relative inline-flex size-2 rounded-full",
                  config.solidClassName,
                )}
              />
            </span>

            {showUsers && (
              <span className="text-xs text-neutral-400">{users.length}</span>
            )}
          </span>
        }
      >
        <p className="text-sm uppercase font-mono font-bold">{config.label}</p>

        {showUsers && (
          <ul className="mt-4 flex flex-col gap-1 text-sm">
            {users.map((user) => (
              <li key={user.name} className="flex items-center gap-1.5">
                <span
                  className="size-2 flex-none rounded-full"
                  style={{ backgroundColor: user.color }}
                />
                {user.name}
              </li>
            ))}
          </ul>
        )}
      </PopoverBaseUI>
    </span>
  );
};
