import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import type { Role } from "@sam-monorepo/database/browser";

interface Props {
  readonly className?: string;
  readonly defaultValue?: readonly Role["id"][];
}

export const RequiredRoles = ({ className, defaultValue }: Props) => {
  return (
    <RolePicker
      mode={ItemPickerMode.Multiple}
      className={className}
      name="requiredRole[]"
      label="Erforderliche Rolle(n)"
      helpText="Dieser Task kann nur von den ausgewählten Rollen angenommen werden. optional"
      defaultValue={defaultValue}
    />
  );
};
