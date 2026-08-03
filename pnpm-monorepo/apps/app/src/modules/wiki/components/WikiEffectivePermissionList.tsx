"use client";

import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import clsx from "clsx";
import type { WikiEffectivePermissionEntry } from "../utils/resolveWikiPageEffectivePermissions";

interface Props {
  readonly className?: string;
  readonly heading: string;
  readonly entries: readonly WikiEffectivePermissionEntry[];
  /** Shown instead of the list when nobody holds the permission */
  readonly emptyLabel: string;
}

/**
 * Who holds a permission on the page, as roles rather than citizens. Shows
 * the saved state — selections in this dialog only take effect once saved.
 */
export const WikiEffectivePermissionList = ({
  className,
  heading,
  entries,
  emptyLabel,
}: Props) => (
  <div className={clsx("text-sm", className)}>
    <span className="text-neutral-400">{heading}</span>

    {entries.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
        {entries.map((entry) => (
          <div
            key={entry.roleId ?? entry.label}
            className="flex items-center gap-1"
          >
            {entry.roleId ? (
              <SingleRoleBadge
                roleId={entry.roleId}
                showPlaceholder
                className="bg-neutral-700/50"
              />
            ) : (
              <span className="bg-neutral-700/50 rounded-secondary px-2 py-1">
                {entry.label}
              </span>
            )}

            {entry.note && (
              <span className="text-xs text-neutral-400">{entry.note}</span>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-neutral-400 mt-1">{emptyLabel}</p>
    )}
  </div>
);
