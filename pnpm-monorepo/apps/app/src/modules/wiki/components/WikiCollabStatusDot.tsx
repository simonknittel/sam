"use client";

import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { WebSocketStatus } from "@hocuspocus/provider";
import clsx from "clsx";

/**
 * The transport status plus the provider-level failure the transport can't
 * see: authentication happens inside the open socket, so a rejected session
 * token (or a failed token mint) leaves the WebSocketStatus at "connected"
 * while nothing syncs.
 */
export type WikiCollabStatus = WebSocketStatus | "authenticationFailed";

const STATUS_CONFIG: Record<
  WikiCollabStatus,
  {
    label: string;
    description?: string;
    solidClassName: string;
    pingClassName: string;
  }
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
  authenticationFailed: {
    label: "Nicht berechtigt",
    description:
      "Die Echtzeit-Verbindung wurde nicht autorisiert. Änderungen werden nicht gespeichert.",
    solidClassName: "bg-amber-500",
    pingClassName: "bg-amber-500",
  },
};

export interface WikiCollabUser {
  readonly name: string;
  readonly color: string;
  /** Whether they have edit mode toggled on — everyone else is just reading */
  readonly isEditing: boolean;
}

interface Props {
  readonly className?: string;
  readonly status: WikiCollabStatus;
  /** Connected users (from the provider's awareness states) */
  readonly users: readonly WikiCollabUser[];
}

/**
 * Pinging connection indicator of the collaborative editor (green:
 * connected, blue: connecting, red: disconnected, amber: authentication
 * failed), like the dot badge on the app tiles, plus the number of
 * connected users. The popover explains the state and lists the users by
 * name, split into the ones who are editing right now and the ones who
 * are only reading along.
 */
export const WikiCollabStatusDot = ({ className, status, users }: Props) => {
  const config = STATUS_CONFIG[status];
  const showUsers = status === WebSocketStatus.Connected && users.length > 0;
  const editingUsers = users.filter((user) => user.isEditing);
  const readingUsers = users.filter((user) => !user.isEditing);

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

        {config.description && (
          <p className="mt-2 max-w-64 text-sm text-neutral-300">
            {config.description}
          </p>
        )}

        {showUsers && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Mode wording follows the edit-mode toggle (WikiEditModeToggle) */}
            <UserSection label="Bearbeiten" users={editingUsers} />
            <UserSection label="Lesen" users={readingUsers} />
          </div>
        )}
      </PopoverBaseUI>
    </span>
  );
};

interface UserSectionProps {
  readonly label: string;
  readonly users: readonly WikiCollabUser[];
}

/**
 * One group of the popover's user list. Renders nothing when the group is
 * empty, so a heading never stands without users under it.
 */
const UserSection = ({ label, users }: UserSectionProps) => {
  if (users.length <= 0) return null;

  return (
    <div>
      <p className="text-xs uppercase font-mono text-neutral-400">{label}</p>

      <ul className="mt-1 flex flex-col gap-1 text-sm">
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
    </div>
  );
};
