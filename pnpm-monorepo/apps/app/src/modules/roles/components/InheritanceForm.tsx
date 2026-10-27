"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import type { ManagedRole } from "@sam-monorepo/application";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { updateRoleInheritance } from "../actions/updateRoleInheritance";
import type { RolePickerRole } from "./RolePicker/RolePanel";
import { RolePicker } from "./RolePicker/RolePicker";

interface Props {
  readonly className?: string;
  readonly currentRole: Pick<ManagedRole, "id" | "inherits">;
  /** All roles that the current role can inherit from */
  readonly roles: readonly RolePickerRole[];
}

export const InheritanceForm = ({ className, currentRole, roles }: Props) => {
  const { formAction } = useAction(updateRoleInheritance);

  return (
    <form action={formAction} className={clsx(className)}>
      <input type="hidden" name="id" value={currentRole.id} />

      <RolePicker
        mode={ItemPickerMode.Multiple}
        name="roles"
        roles={roles}
        defaultValue={currentRole.inherits.map((role) => role.id)}
      />

      <SubmitButton icon={<FaSave />} className="mt-4">
        Speichern
      </SubmitButton>
    </form>
  );
};
