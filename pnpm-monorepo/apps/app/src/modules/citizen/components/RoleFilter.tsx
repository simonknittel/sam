"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import {
  filterCheckboxListParsers,
  getFilterValue,
  getFilterValues,
} from "@/modules/common/utils/filterCheckboxListParsers";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { MAXIMUM_CITIZEN_LIST_ROLE_FILTERS } from "@sam-monorepo/domain";
import { useTopLoader } from "nextjs-toploader";
import { useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";

/**
 * The prefix of the role filters in the `filters` parameter (see
 * `CitizenTableTile`)
 */
const FILTER_PREFIX = "role";

interface Props {
  readonly className?: string;
}

/**
 * Filters the citizen table by roles, in the same `filters` URL parameter as
 * the `FilterCheckboxList` filters. A change in the open popover applies
 * when the popover closes. The removal of a selected role applies at once.
 */
export const RoleFilter = ({ className }: Props) => {
  const [isLoading, startTransition] = useTransition();
  const [{ filters }, setSearchParams] = useQueryStates(
    filterCheckboxListParsers,
    { shallow: false, history: "push", startTransition },
  );

  const loader = useTopLoader();

  useEffect(() => {
    if (isLoading) {
      loader.start();
    }
  }, [loader, isLoading]);

  const appliedRoleIds = [...new Set(getFilterValues(filters, FILTER_PREFIX))];

  /** The selection in the open popover, or null while the popover is closed */
  const [draftRoleIds, setDraftRoleIds] = useState<BadgeRole["id"][] | null>(
    null,
  );

  const applyRoleIds = (roleIds: readonly BadgeRole["id"][]) => {
    const roleIdSet = new Set(roleIds);
    if (
      roleIdSet.size === appliedRoleIds.length &&
      appliedRoleIds.every((roleId) => roleIdSet.has(roleId))
    )
      return;

    const rolePrefix = getFilterValue(FILTER_PREFIX, "");

    void setSearchParams((current) => ({
      filters: [
        ...current.filters.filter((filter) => !filter.startsWith(rolePrefix)),
        ...[...roleIdSet].map((roleId) =>
          getFilterValue(FILTER_PREFIX, roleId),
        ),
      ],
      page: null,
    }));
  };

  const handleChange = (roleIds: BadgeRole["id"][]) => {
    if (draftRoleIds !== null) {
      setDraftRoleIds(roleIds);
    } else {
      applyRoleIds(roleIds);
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
    <RolePicker
      className={className}
      mode={ItemPickerMode.Multiple}
      value={draftRoleIds ?? appliedRoleIds}
      onChange={handleChange}
      onOpenChange={handleOpenChange}
      max={MAXIMUM_CITIZEN_LIST_ROLE_FILTERS}
    />
  );
};
