"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { Tile } from "@/modules/common/components/Tile";
import type { ManagedRoleTag } from "@sam-monorepo/application";
import { FaSave } from "react-icons/fa";
import { updateRoleTag } from "../../actions/updateRoleTag";
import type { RolePickerRole } from "../RolePicker/RolePanel";
import { RolePicker } from "../RolePicker/RolePicker";
import { RoleTagFields } from "./RoleTagFields";
import { useSelectionChanges } from "./useSelectionChanges";

interface Props {
  readonly tag: Pick<ManagedRoleTag, "id" | "name" | "description" | "roleIds">;
  /** All roles: `role;manage` manages the tags of all roles */
  readonly roles: readonly RolePickerRole[];
}

/**
 * The form keeps its values after the save (`submitWithoutReset`), thus a
 * name that a different tag has stays in the field next to the error.
 */
export const UpdateRoleTagForm = ({ tag, roles }: Props) => {
  const { state, isPending, submitWithoutReset } = useAction(updateRoleTag, {
    errorToast: false,
  });
  const { selectedIds, setSelectedIds, addedIds, removedIds } =
    useSelectionChanges(tag.roleIds);

  return (
    <Tile heading="Tag bearbeiten">
      <form onSubmit={submitWithoutReset}>
        <input type="hidden" name="tagId" value={tag.id} />

        {addedIds.map((roleId) => (
          <input key={roleId} type="hidden" name="addRoleIds" value={roleId} />
        ))}

        {removedIds.map((roleId) => (
          <input
            key={roleId}
            type="hidden"
            name="removeRoleIds"
            value={roleId}
          />
        ))}

        <RoleTagFields tag={tag} />

        <RolePicker
          mode={ItemPickerMode.Multiple}
          label="Rollen"
          roles={roles}
          value={selectedIds}
          onChange={setSelectedIds}
          className="mt-4"
        />

        <ActionErrorNote className="mt-4" state={state} />

        <Button2 type="submit" disabled={isPending} className="mt-4 ml-auto">
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </form>
    </Tile>
  );
};
