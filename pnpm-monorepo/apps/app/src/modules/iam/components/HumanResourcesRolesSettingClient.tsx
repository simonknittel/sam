"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import type { Role } from "@sam-monorepo/database/browser";
import { MAX_HUMAN_RESOURCES_ROLES } from "@sam-monorepo/domain";
import { FaSave } from "react-icons/fa";
import { updateHumanResourcesRoles } from "../actions/updateHumanResourcesRoles";

interface Props {
  readonly defaultRoleIds: readonly Role["id"][];
}

export const HumanResourcesRolesSettingClient = ({ defaultRoleIds }: Props) => {
  const { state, formAction } = useAction(updateHumanResourcesRoles, {
    errorToast: false,
  });

  return (
    <form action={formAction}>
      <RolePicker
        mode={ItemPickerMode.Multiple}
        name="roleId"
        label="Rollen"
        helpText={`Maximal ${MAX_HUMAN_RESOURCES_ROLES} Rollen sind möglich.`}
        defaultValue={defaultRoleIds}
        max={MAX_HUMAN_RESOURCES_ROLES}
      />

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Speichern
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
