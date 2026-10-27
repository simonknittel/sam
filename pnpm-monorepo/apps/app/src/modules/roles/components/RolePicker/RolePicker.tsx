"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import type { BadgeRole } from "@/modules/roles/queries/getRoles";
import clsx from "clsx";
import { useId, useRef, useState, type ReactNode } from "react";
import { FaChevronDown, FaUsers } from "react-icons/fa";
import { useRolesContext } from "../RolesContext";
import {
  compareNames,
  RolePanel,
  type RolePickerExtraEntry,
  type RolePickerRole,
} from "./RolePanel";
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
   * Replaces the roles of the roles context, which are the roles that the
   * viewer can see. Example: all roles for a user with `role;manage`. The
   * offered roles, the selected roles and the search use this list. The tags
   * still come from the context.
   */
  readonly roles?: readonly RolePickerRole[];
  /**
   * Limits the offered roles, for example to the read roles of the parent
   * wiki page. Selected roles outside of this list stay selected.
   */
  readonly offeredRoleIds?: readonly BadgeRole["id"][];
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
  /**
   * Prevents the deselection of the selected role, and the submit of the
   * form without a selected role
   */
  readonly required?: boolean;
  /** Entries above the roles, for example "Alle" with the id `*` */
  readonly extraEntries?: readonly RolePickerExtraEntry[];
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
 * Offers the roles that the viewer can see (or the roles of `roles`) in a
 * popover. In single mode, the trigger shows the selected role. In multiple
 * mode, the selected roles show under the trigger. A selected role that is
 * not in these roles stays selected and is submitted.
 */
export const RolePicker = (props: Props) => {
  const {
    className,
    name,
    label,
    helpText,
    roles: suppliedRoles,
    offeredRoleIds,
    onOpenChange,
  } = props;
  const { roles: visibleRoles } = useRolesContext();
  const roles = suppliedRoles ?? visibleRoles;

  const [uncontrolledRoleIds, setUncontrolledRoleIds] = useState(() =>
    toRoleIds(props.defaultValue),
  );
  const isControlled = props.value !== undefined;
  const selectedRoleIds = isControlled
    ? toRoleIds(props.value)
    : uncontrolledRoleIds;

  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  /** Single mode with `required`: whether a submit found no selected role */
  const [isInvalid, setIsInvalid] = useState(false);
  const showsRequiredError = isInvalid && selectedRoleIds.length === 0;

  const changeOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const changeSelection = (roleIds: readonly BadgeRole["id"][]) => {
    if (!isControlled) setUncontrolledRoleIds(roleIds);
    setIsInvalid(false);

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
    } else {
      changeSelection([...selectedRoleIds, roleId]);
    }
  };

  const handleTagClick = (roleIds: BadgeRole["id"][]) => {
    changeSelection([...selectedRoleIds, ...roleIds]);
  };

  /** The roles by name, then the roles that the viewer cannot see */
  const roleIndexById = new Map(
    roles.toSorted(compareNames).map((role, index) => [role.id, index]),
  );
  const getSortIndex = (roleId: BadgeRole["id"]) =>
    roleIndexById.get(roleId) ?? roles.length;
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
                  roles={roles}
                  extraEntries={props.extraEntries}
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
              ref={triggerRef}
              type="button"
              title="Rolle auswählen"
              aria-describedby={showsRequiredError ? errorId : undefined}
              className={clsx(
                "inline-flex max-w-full cursor-pointer items-center justify-between gap-1 rounded-secondary bg-neutral-700/50 pr-3 outline-offset-4 outline-interaction-700 hover:bg-neutral-600/50 focus-visible:outline-2 active:bg-neutral-700/30",
                { "ring-1 ring-brand-red-500": showsRequiredError },
              )}
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
          roles={roles}
          offeredRoleIds={offeredRoleIds}
          extraEntries={
            props.mode === ItemPickerMode.Single
              ? props.extraEntries
              : undefined
          }
          max={props.mode === ItemPickerMode.Multiple ? props.max : undefined}
          onRoleClick={handleRoleClick}
          onTagClick={handleTagClick}
        />
      </ItemPickerPopover>

      {props.mode === ItemPickerMode.Single && props.required && (
        /**
         * The browser does not submit the form while this field is empty. The
         * field has no name, thus the form does not submit its value. The
         * message of the browser would show at this hidden field, thus the
         * picker shows its own message and focuses its trigger.
         */
        <input
          required
          tabIndex={-1}
          aria-hidden
          value={selectedRoleId ?? ""}
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            setIsInvalid(true);
            triggerRef.current?.focus();
          }}
          className="sr-only"
        />
      )}

      {showsRequiredError && (
        <p id={errorId} className="mt-1 text-sm text-brand-red-300">
          Wähle eine Rolle aus.
        </p>
      )}

      {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}

      {props.mode === ItemPickerMode.Multiple &&
        !props.hideChips &&
        sortedSelectedRoleIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {sortedSelectedRoleIds.map((roleId) => (
              <RolePickerChip
                key={roleId}
                roleId={roleId}
                roles={roles}
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
