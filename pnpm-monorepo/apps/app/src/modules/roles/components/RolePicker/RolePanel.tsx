"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import type { ItemPickerItem } from "@/modules/common/components/ItemPicker/ItemPickerOption";
import { ItemPickerPanel } from "@/modules/common/components/ItemPicker/ItemPickerPanel";
import { underlineCharacters } from "@/modules/common/utils/underlineCharacters";
import type { BadgeRole, BadgeRoleTag } from "@/modules/roles/queries/getRoles";
import Fuse from "fuse.js";
import { useState, type ReactNode } from "react";
import { useRolesContext } from "../RolesContext";
import { RoleTagChip } from "./RoleTagChip";
import { UploadedIcon, UploadedIconSize } from "./UploadedIcon";

/** An entry above the roles, for example "Alle" with the id `*` */
export interface RolePickerExtraEntry {
  readonly id: string;
  readonly name: string;
}

interface SearchEntry {
  readonly id: string;
  readonly name: string;
  readonly tagNames: readonly string[];
}

/**
 * 0 finds only exact matches, 1 finds everything. 0.2 permits small typing
 * errors. The role assignment of a citizen uses the same value.
 */
const SEARCH_THRESHOLD = 0.2;

/**
 * Searches the names and the tag names. Gives the ids of the matched
 * entries, each with the character ranges of the match in the name.
 */
const search = (entries: readonly SearchEntry[], query: string) => {
  const fuse = new Fuse(entries, {
    keys: ["name", "tagNames"],
    includeMatches: true,
    threshold: SEARCH_THRESHOLD,
  });

  return new Map(
    fuse
      .search(query)
      .map((result) => [
        result.item.id,
        result.matches?.find((match) => match.key === "name")?.indices,
      ]),
  );
};

interface Props {
  readonly className?: string;
  readonly mode: ItemPickerMode;
  readonly selectedRoleIds: readonly BadgeRole["id"][];
  /**
   * Limits the offered roles. Without it, the panel offers all roles that
   * the viewer can see.
   */
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
  readonly renderTrailing?: (
    roleId: BadgeRole["id"],
    isSelected: boolean,
  ) => ReactNode;
}

/**
 * The content of the role picker: a search over the role names and the tag
 * names, the tags of the offered roles, and one offered role per row. It
 * works in the popover of `RolePicker` and also embedded, for example in a
 * modal. The owner holds the selection.
 */
export const RolePanel = ({
  className,
  mode,
  selectedRoleIds,
  offeredRoleIds,
  disabledRoles,
  extraEntries = [],
  max,
  onRoleClick,
  onTagClick,
  renderTrailing,
}: Props) => {
  const { roles, tags, tagIdsByRoleId } = useRolesContext();
  const [query, setQuery] = useState("");
  /** Single mode: the tag that filters the list */
  const [filterTagId, setFilterTagId] = useState<BadgeRoleTag["id"] | null>(
    null,
  );

  const offeredRoles = offeredRoleIds
    ? roles.filter((role) => offeredRoleIds.includes(role.id))
    : roles;
  const offeredRoleIdSet = new Set(offeredRoles.map((role) => role.id));
  const selectedRoleIdSet = new Set(selectedRoleIds);

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const offeredTags = tags
    .filter((tag) => tag.roleIds.some((roleId) => offeredRoleIdSet.has(roleId)))
    .toSorted((first, second) => first.name.localeCompare(second.name));
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

  const handleTagClick = (tagId: BadgeRoleTag["id"]) => {
    if (mode === ItemPickerMode.Single) {
      setFilterTagId((previous) => (previous === tagId ? null : tagId));
      return;
    }

    const tag = tagById.get(tagId);
    if (tag) onTagClick?.(getAddableRoleIds(tag));
  };

  const listedRoles = filterTag
    ? offeredRoles.filter((role) => filterTag.roleIds.includes(role.id))
    : offeredRoles;
  const listedExtraEntries = filterTag ? [] : extraEntries;

  const trimmedQuery = query.trim();
  const matches = trimmedQuery
    ? search(
        [
          ...listedExtraEntries.map((entry) => ({ ...entry, tagNames: [] })),
          ...listedRoles.map((role) => ({
            id: role.id,
            name: role.name,
            tagNames: (tagIdsByRoleId.get(role.id) ?? []).flatMap((tagId) => {
              const tag = tagById.get(tagId);
              return tag ? [tag.name] : [];
            }),
          })),
        ],
        trimmedQuery,
      )
    : null;
  const isListed = (id: string) => !matches || matches.has(id);

  const toItem = (
    entry: { readonly id: string; readonly name: string },
    icon?: ReactNode,
  ): ItemPickerItem => {
    const nameMatch = matches?.get(entry.id);

    return {
      id: entry.id,
      name: entry.name,
      nameContent: nameMatch
        ? underlineCharacters(entry.name, nameMatch)
        : undefined,
      icon,
      disabledReason: getDisabledReason(entry.id),
    };
  };

  return (
    <ItemPickerPanel
      className={className}
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
        .filter((entry) => isListed(entry.id))
        .map((entry) => toItem(entry))}
      items={listedRoles
        .filter((role) => isListed(role.id))
        .map((role) =>
          toItem(
            role,
            role.icon && (
              <UploadedIcon upload={role.icon} size={UploadedIconSize.Medium} />
            ),
          ),
        )}
      selectedIds={selectedRoleIds}
      onSelect={onRoleClick}
      emptyText="Keine Rolle gefunden"
      renderTrailing={
        renderTrailing &&
        ((item, isSelected) => renderTrailing(item.id, isSelected))
      }
    />
  );
};
