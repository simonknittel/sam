"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import type { ItemPickerItem } from "@/modules/common/components/ItemPicker/ItemPickerOption";
import { ItemPickerPanel } from "@/modules/common/components/ItemPicker/ItemPickerPanel";
import { searchItems } from "@/modules/common/components/ItemPicker/searchItems";
import {
  UploadedIcon,
  UploadedIconSize,
} from "@/modules/common/components/UploadedIcon";
import type { BadgeRole, BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import { useState, type ReactNode } from "react";
import { useRolesContext } from "../RolesContext";
import { RoleTagChip } from "./RoleTagChip";

/** An entry above the roles, for example "Alle" with the id `*` */
export interface RolePickerExtraEntry {
  readonly id: string;
  readonly name: string;
}

/** A role that the picker offers or shows as selected */
export type RolePickerRole = Pick<BadgeRole, "id" | "name" | "icon">;

export const compareNames = (
  first: { readonly name: string },
  second: { readonly name: string },
) => first.name.localeCompare(second.name);

interface Props {
  readonly mode: ItemPickerMode;
  readonly selectedRoleIds: readonly BadgeRole["id"][];
  /**
   * Replaces the roles of the roles context, which are the roles that the
   * viewer can see. Example: all roles for a user with `role;manage`. The
   * tags still come from the context.
   */
  readonly roles?: readonly RolePickerRole[];
  /** Limits the offered roles to these roles */
  readonly offeredRoleIds?: readonly BadgeRole["id"][];
  /** Offered roles that the viewer cannot select, each with the reason */
  readonly disabledRoles?: ReadonlyMap<BadgeRole["id"], string>;
  readonly extraEntries?: readonly RolePickerExtraEntry[];
  /**
   * Multiple mode: the maximum number of selected roles. At the maximum, the
   * roles that are not selected are disabled. A tag is disabled when its
   * roles would go over the maximum.
   */
  readonly max?: number;
  /** A click or Enter on a role or an extra entry that is not disabled */
  readonly onRoleClick: (roleId: BadgeRole["id"]) => void;
  /**
   * Multiple mode: a click on a tag. Gives the offered roles of the tag that
   * are not disabled and not selected yet. In single mode, a click on a tag
   * filters the list.
   */
  readonly onTagClick?: (roleIds: BadgeRole["id"][]) => void;
  /** See `renderTrailing` of `ItemPickerPanel` */
  readonly renderTrailing?: (isSelected: boolean) => ReactNode;
}

/**
 * The content of the role picker: a search over the role names and the tag
 * names, the tags of the offered roles, and one offered role per row. It
 * works in the popover of `RolePicker` and also embedded, for example in a
 * modal. The owner holds the selection.
 */
export const RolePanel = ({
  mode,
  selectedRoleIds,
  roles,
  offeredRoleIds,
  disabledRoles,
  extraEntries = [],
  max,
  onRoleClick,
  onTagClick,
  renderTrailing,
}: Props) => {
  const { roles: visibleRoles, tags, tagsByRoleId } = useRolesContext();
  const [query, setQuery] = useState("");
  /** Single mode: the tag that filters the list */
  const [filterTagId, setFilterTagId] = useState<BadgeRoleTag["id"] | null>(
    null,
  );

  const availableRoles = roles ?? visibleRoles;
  const offeredRoles = (
    offeredRoleIds
      ? availableRoles.filter((role) => offeredRoleIds.includes(role.id))
      : availableRoles
  ).toSorted(compareNames);
  const offeredRoleIdSet = new Set(offeredRoles.map((role) => role.id));
  const selectedRoleIdSet = new Set(selectedRoleIds);

  const offeredTags = tags.filter((tag) =>
    tag.roleIds.some((roleId) => offeredRoleIdSet.has(roleId)),
  );
  const filterTag =
    mode === ItemPickerMode.Single
      ? offeredTags.find((tag) => tag.id === filterTagId)
      : undefined;

  const getDisabledReason = (roleId: BadgeRole["id"]) => {
    const disabledReason = disabledRoles?.get(roleId);
    if (disabledReason !== undefined) return disabledReason;

    if (
      max !== undefined &&
      selectedRoleIds.length >= max &&
      !selectedRoleIdSet.has(roleId)
    )
      return `Du kannst maximal ${max} Rollen auswählen.`;

    return undefined;
  };

  /** The roles that a click on the tag adds, sorted by name */
  const getAddableRoleIds = (tag: BadgeRoleTag) => {
    const tagRoleIdSet = new Set(tag.roleIds);

    return offeredRoles
      .filter(
        (role) =>
          tagRoleIdSet.has(role.id) &&
          !disabledRoles?.has(role.id) &&
          !selectedRoleIdSet.has(role.id),
      )
      .map((role) => role.id);
  };

  const getTagDisabledReason = (tag: BadgeRoleTag) => {
    if (mode !== ItemPickerMode.Multiple || max === undefined) return undefined;
    if (selectedRoleIds.length + getAddableRoleIds(tag).length <= max)
      return undefined;

    return `Mit den Rollen dieses Tags wären mehr als ${max} Rollen ausgewählt.`;
  };

  const handleTagClick = (tag: BadgeRoleTag) => {
    if (mode === ItemPickerMode.Single) {
      setFilterTagId((previous) => (previous === tag.id ? null : tag.id));
      return;
    }

    onTagClick?.(getAddableRoleIds(tag));
  };

  const listedRoles = filterTag
    ? offeredRoles.filter((role) => filterTag.roleIds.includes(role.id))
    : offeredRoles;
  const listedExtraEntries = filterTag ? [] : extraEntries;

  const search = searchItems(
    [
      ...listedExtraEntries.map((entry) => ({ ...entry, tagNames: [] })),
      ...listedRoles.map((role) => ({
        id: role.id,
        name: role.name,
        tagNames: (tagsByRoleId.get(role.id) ?? []).map((tag) => tag.name),
      })),
    ],
    query,
    ["name", "tagNames"],
  );
  const bestMatchId = search.matchedIds.find(
    (id) => getDisabledReason(id) === undefined,
  );

  const toItem = (
    entry: { readonly id: string; readonly name: string },
    icon?: ReactNode,
  ): ItemPickerItem => ({
    id: entry.id,
    name: entry.name,
    nameContent: search.getNameContent(entry),
    icon,
    disabledReason: getDisabledReason(entry.id),
  });

  return (
    <ItemPickerPanel
      mode={mode}
      label="Rollen"
      searchPlaceholder="Rolle oder Tag suchen …"
      query={query}
      onQueryChange={setQuery}
      toolbar={
        offeredTags.length > 0 && (
          <div
            role="group"
            aria-label={
              mode === ItemPickerMode.Single
                ? "Nach Tag filtern"
                : "Alle Rollen eines Tags auswählen"
            }
            className="flex max-h-24 flex-wrap gap-1 overflow-y-auto"
          >
            {offeredTags.map((tag) => (
              <RoleTagChip
                key={tag.id}
                tag={tag}
                isPressed={
                  mode === ItemPickerMode.Single
                    ? tag.id === filterTag?.id
                    : undefined
                }
                disabledReason={getTagDisabledReason(tag)}
                onClick={handleTagClick}
              />
            ))}
          </div>
        )
      }
      extraItems={listedExtraEntries
        .filter((entry) => search.isListed(entry.id))
        .map((entry) => toItem(entry))}
      items={listedRoles
        .filter((role) => search.isListed(role.id))
        .map((role) =>
          toItem(
            role,
            role.icon && (
              <UploadedIcon upload={role.icon} size={UploadedIconSize.Medium} />
            ),
          ),
        )}
      bestMatchId={bestMatchId}
      selectedIds={selectedRoleIds}
      onSelect={onRoleClick}
      emptyText="Keine Rolle gefunden"
      renderTrailing={renderTrailing}
    />
  );
};
