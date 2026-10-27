"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import { useState, type ReactNode } from "react";
import { FaChevronDown, FaUsers } from "react-icons/fa";
import { useRolesContext } from "../RolesContext";
import { RolePanel, type RolePickerExtraEntry } from "./RolePanel";
import { RolePickerChip } from "./RolePickerChip";
import { RolePickerValue } from "./RolePickerValue";

interface CommonProps {
  readonly className?: string;
  /**
   * The form field name of the hidden input of each selected role. Without
   * it, the picker renders no hidden inputs.
   */
  readonly name?: string;
  readonly label?: ReactNode;
  readonly helpText?: ReactNode;
  /**
   * Limits the offered roles, for example to the read roles of the parent
   * wiki page. Selected roles outside of this list stay selected.
   */
  readonly offeredRoleIds?: readonly BadgeRole["id"][];
  /** Offered roles that the viewer cannot select, each with the reason */
  readonly disabledRoles?: ReadonlyMap<BadgeRole["id"], string>;
  /** Entries above the roles, for example "Alle" with the id `*` */
  readonly extraEntries?: readonly RolePickerExtraEntry[];
  /** Reports each open and close of the popover */
  readonly onOpenChange?: (open: boolean) => void;
}

interface SingleProps extends CommonProps {
  readonly mode: ItemPickerMode.Single;
  /** The initial selection of an uncontrolled picker */
  readonly defaultValue?: BadgeRole["id"] | null;
  /** The selection of a controlled picker, together with `onChange` */
  readonly value?: BadgeRole["id"] | null;
  readonly onChange?: (roleId: BadgeRole["id"] | null) => void;
  /** Prevents the deselection of the selected role */
  readonly required?: boolean;
}

interface MultipleProps extends CommonProps {
  readonly mode: ItemPickerMode.Multiple;
  /** The initial selection of an uncontrolled picker */
  readonly defaultValue?: readonly BadgeRole["id"][];
  /** The selection of a controlled picker, together with `onChange` */
  readonly value?: readonly BadgeRole["id"][];
  readonly onChange?: (roleIds: BadgeRole["id"][]) => void;
  /** The maximum number of selected roles */
  readonly max?: number;
  /**
   * Hides the selected roles under the trigger, for an owner that shows the
   * selection in its own rows
   */
  readonly hideChips?: boolean;
}

type Props = SingleProps | MultipleProps;

const toRoleIds = (
  value: BadgeRole["id"] | readonly BadgeRole["id"][] | null | undefined,
): readonly BadgeRole["id"][] => {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  return value;
};

/**
 * Offers the roles that the viewer can see in a popover. In single mode, the
 * trigger shows the selected role. In multiple mode, the selected roles show
 * under the trigger. A selected role that the viewer cannot see stays
 * selected and is submitted.
 */
export const RolePicker = (props: Props) => {
  const {
    className,
    name,
    label,
    helpText,
    offeredRoleIds,
    disabledRoles,
    extraEntries = [],
    onOpenChange,
  } = props;
  const { roles } = useRolesContext();

  const [uncontrolledRoleIds, setUncontrolledRoleIds] = useState(() =>
    toRoleIds(props.defaultValue),
  );
  const isControlled = props.value !== undefined;
  const selectedRoleIds = isControlled
    ? toRoleIds(props.value)
    : uncontrolledRoleIds;

  const [isOpen, setIsOpen] = useState(false);

  const changeOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const changeSelection = (roleIds: readonly BadgeRole["id"][]) => {
    if (!isControlled) setUncontrolledRoleIds(roleIds);

    if (props.mode === ItemPickerMode.Single) {
      props.onChange?.(roleIds[0] ?? null);
    } else {
      props.onChange?.([...roleIds]);
    }
  };

  const removeRole = (roleId: BadgeRole["id"]) => {
    changeSelection(
      selectedRoleIds.filter((selectedRoleId) => selectedRoleId !== roleId),
    );
  };

  const handleRoleClick = (roleId: BadgeRole["id"]) => {
    const isSelected = selectedRoleIds.includes(roleId);

    if (props.mode === ItemPickerMode.Single) {
      if (!isSelected) {
        changeSelection([roleId]);
      } else if (!props.required) {
        changeSelection([]);
      }

      changeOpen(false);
      return;
    }

    if (isSelected) {
      removeRole(roleId);
    } else if (props.max === undefined || selectedRoleIds.length < props.max) {
      changeSelection([...selectedRoleIds, roleId]);
    }
  };

  const handleTagClick = (roleIds: BadgeRole["id"][]) => {
    changeSelection([...selectedRoleIds, ...roleIds]);
  };

  /**
   * The extra entries first, then the roles by name, then the roles that the
   * viewer cannot see
   */
  const roleIndexById = new Map(roles.map((role, index) => [role.id, index]));
  const getSortIndex = (roleId: BadgeRole["id"]) =>
    extraEntries.some((entry) => entry.id === roleId)
      ? -1
      : (roleIndexById.get(roleId) ?? roles.length);
  const sortedSelectedRoleIds = selectedRoleIds.toSorted(
    (first, second) => getSortIndex(first) - getSortIndex(second),
  );

  const selectedRoleId = selectedRoleIds[0];

  return (
    <div className={className}>
      {label && <p className="mb-1">{label}</p>}

      <ItemPickerPopover
        title="Rolle auswählen"
        trigger={
          props.mode === ItemPickerMode.Single ? (
            <>
              {selectedRoleId ? (
                <RolePickerValue
                  roleId={selectedRoleId}
                  extraEntries={extraEntries}
                />
              ) : (
                <span className="flex h-8 items-center gap-2 px-2 font-mono text-sm">
                  <FaUsers className="flex-none" /> Rolle auswählen
                </span>
              )}

              <FaChevronDown className="flex-none text-brand-red-500" />
            </>
          ) : (
            <>
              <FaUsers /> Rolle auswählen
            </>
          )
        }
        triggerRender={
          // Each mode keeps one element type. After a pick, a new element would not get the focus back from the popover.
          props.mode === ItemPickerMode.Single ? (
            <button
              type="button"
              title="Rolle auswählen"
              className="inline-flex max-w-full cursor-pointer items-center justify-between gap-1 rounded-secondary bg-neutral-700/50 pr-3 outline-offset-4 outline-interaction-700 hover:bg-neutral-600/50 focus-visible:outline-2 active:bg-neutral-700/30"
            />
          ) : (
            <Button2
              type="button"
              title="Rolle auswählen"
              variant={Button2Variant.Secondary}
              className="flex-none"
            />
          )
        }
        open={isOpen}
        onOpenChange={changeOpen}
      >
        <RolePanel
          mode={props.mode}
          selectedRoleIds={selectedRoleIds}
          offeredRoleIds={offeredRoleIds}
          disabledRoles={disabledRoles}
          extraEntries={extraEntries}
          max={props.mode === ItemPickerMode.Multiple ? props.max : undefined}
          onRoleClick={handleRoleClick}
          onTagClick={handleTagClick}
        />
      </ItemPickerPopover>

      {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}

      {props.mode === ItemPickerMode.Multiple &&
        !props.hideChips &&
        sortedSelectedRoleIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {sortedSelectedRoleIds.map((roleId) => (
              <RolePickerChip
                key={roleId}
                roleId={roleId}
                extraEntries={extraEntries}
                onRemove={removeRole}
              />
            ))}
          </div>
        )}

      {name &&
        selectedRoleIds.map((roleId) => (
          <input key={roleId} type="hidden" name={name} value={roleId} />
        ))}
    </div>
  );
};
