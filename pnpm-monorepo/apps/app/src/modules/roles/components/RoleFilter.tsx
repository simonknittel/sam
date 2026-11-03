"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { useTopLoader } from "nextjs-toploader";
import {
  parseAsArrayOf,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { useEffect, useState, useTransition } from "react";

interface Props {
  /** The search param that holds the ids of the selected roles */
  readonly name: string;
  readonly resetCursorPagination?: boolean;
  /** The maximum number of selected roles */
  readonly max?: number;
}

/**
 * Filters a table of a sidebar layout by roles. A change in the open popover
 * applies when the popover closes. The removal of a selected role applies at
 * once.
 */
export const RoleFilter = ({ name, resetCursorPagination, max }: Props) => {
  const [isLoading, startTransition] = useTransition();
  const [roleIds, setRoleIds] = useQueryState(
    name,
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({
      shallow: false,
      startTransition,
    }),
  );
  const [, setPagination] = useQueryStates(cursorPaginationParsers, {
    shallow: false,
    startTransition,
  });

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  const appliedRoleIds = [...new Set(roleIds)];

  /** The selection in the open popover, or null while the popover is closed */
  const [draftRoleIds, setDraftRoleIds] = useState<BadgeRole["id"][] | null>(
    null,
  );

  const applyRoleIds = (newRoleIds: readonly BadgeRole["id"][]) => {
    const roleIdSet = new Set(newRoleIds);
    if (
      roleIdSet.size === appliedRoleIds.length &&
      appliedRoleIds.every((roleId) => roleIdSet.has(roleId))
    )
      return;

    /** In the same tick, nuqs gives both changes one URL update */
    void setRoleIds([...roleIdSet]);
    if (resetCursorPagination)
      void setPagination({ cursor: null, direction: null });
  };

  const handleChange = (newRoleIds: BadgeRole["id"][]) => {
    if (draftRoleIds !== null) {
      setDraftRoleIds(newRoleIds);
    } else {
      applyRoleIds(newRoleIds);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraftRoleIds(appliedRoleIds);
      return;
    }

    if (draftRoleIds) applyRoleIds(draftRoleIds);
    setDraftRoleIds(null);
  };

  return (
    <div className="corners-secondary bg-secondary p-2">
      <p className="font-mono text-sm text-white/40 uppercase">Rollen</p>

      <RolePicker
        className="mt-1"
        mode={ItemPickerMode.Multiple}
        value={draftRoleIds ?? appliedRoleIds}
        onChange={handleChange}
        onOpenChange={handleOpenChange}
        max={max}
      />
    </div>
  );
};
