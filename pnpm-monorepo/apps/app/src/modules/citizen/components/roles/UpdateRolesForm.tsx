"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import {
  RolePanel,
  type RolePickerRole,
} from "@/modules/roles/components/RolePicker/RolePanel";
import { type Citizen, type Role } from "@sam-monorepo/database/browser";
import { debounce, type DebouncedFunc } from "lodash";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { updateRoleAssignments } from "../../actions/updateRoleAssignment";

/** Several changes within this time in milliseconds share one save */
const SAVE_DEBOUNCE = 1_000;

const toFormData = (
  citizenId: Citizen["id"],
  roleIds: readonly Role["id"][],
) => {
  const formData = new FormData();
  formData.set("citizenId", citizenId);
  for (const roleId of roleIds) formData.set(`role_${roleId}`, "on");
  return formData;
};

interface Props {
  readonly citizenId: Citizen["id"];
  /** The saved roles of the citizen */
  readonly assignedRoleIds: readonly Role["id"][];
  /** The roles that the viewer can give to the citizen or take away */
  readonly assignableRoles: readonly RolePickerRole[];
  /** Runs after each successful save */
  readonly onSaved?: () => void;
}

/**
 * The roles of a citizen with a checkbox each. A change saves itself after
 * the debounce. A role that the viewer may not give (or take away, if the
 * citizen has it) is disabled.
 */
export const UpdateRolesForm = ({
  citizenId,
  assignedRoleIds,
  assignableRoles,
  onSaved,
}: Props) => {
  const authentication = useAuthentication();
  const [checkedRoleIds, setCheckedRoleIds] = useState(assignedRoleIds);

  const handleSaved = useEffectEvent(() => onSaved?.());

  const saveRef = useRef<DebouncedFunc<
    (roleIds: readonly Role["id"][]) => Promise<void>
  > | null>(null);

  /**
   * One debounce while the form shows, thus a render does not save. The
   * dialog removes the form when it closes. Thus a change that waits for the
   * debounce is saved then, and not lost.
   */
  useEffect(() => {
    const save = debounce(async (roleIds: readonly Role["id"][]) => {
      if (
        await runAction(updateRoleAssignments, toFormData(citizenId, roleIds))
      )
        handleSaved();
    }, SAVE_DEBOUNCE);
    saveRef.current = save;

    return () => {
      void save.flush();
    };
  }, [citizenId]);

  /**
   * The same rule as the server: the permission depends on the saved state
   * of the role. Thus the viewer can undo a change before the save.
   */
  const assignedRoleIdSet = new Set(assignedRoleIds);
  const disabledRoles = new Map(
    assignableRoles.flatMap((role): [Role["id"], string][] => {
      const isAssigned = assignedRoleIdSet.has(role.id);
      const isPermitted =
        authentication &&
        authentication.authorize(
          "otherRole",
          isAssigned ? "dismiss" : "assign",
          [{ key: "roleId", value: role.id }],
        );
      if (isPermitted) return [];

      return [
        [
          role.id,
          isAssigned
            ? "Du darfst diese Rolle nicht entfernen."
            : "Du darfst diese Rolle nicht zuweisen.",
        ],
      ];
    }),
  );

  const changeRoles = (roleIds: readonly Role["id"][]) => {
    setCheckedRoleIds(roleIds);
    void saveRef.current?.(roleIds);
  };

  const handleRoleClick = (roleId: Role["id"]) => {
    changeRoles(
      checkedRoleIds.includes(roleId)
        ? checkedRoleIds.filter((checkedRoleId) => checkedRoleId !== roleId)
        : [...checkedRoleIds, roleId],
    );
  };

  const handleTagClick = (roleIds: Role["id"][]) => {
    if (roleIds.length > 0) changeRoles([...checkedRoleIds, ...roleIds]);
  };

  return (
    <RolePanel
      mode={ItemPickerMode.Multiple}
      selectedRoleIds={checkedRoleIds}
      roles={assignableRoles}
      disabledRoles={disabledRoles}
      onRoleClick={handleRoleClick}
      onTagClick={handleTagClick}
      renderTrailing={(unused, isSelected) => (
        // The row is the control. Without pointer events, a click on the checkbox is a click on the row.
        <YesNoCheckbox
          checked={isSelected}
          readOnly
          tabIndex={-1}
          aria-hidden
          hideLabel
          className="pointer-events-none"
        />
      )}
    />
  );
};
