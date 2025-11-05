"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { type Role } from "@prisma/client";

interface Props {
  readonly role: Role;
  readonly isChecked?: boolean;
}

export const RoleCheckbox = ({ role, isChecked = false }: Readonly<Props>) => {
  const authentication = useAuthentication();

  let disabled = false;

  if (
    isChecked &&
    (!authentication ||
      !authentication.authorize("otherRole", "dismiss", [
        {
          key: "roleId",
          value: role.id,
        },
      ]))
  )
    disabled = true;

  if (
    !isChecked &&
    (!authentication ||
      !authentication.authorize("otherRole", "assign", [
        {
          key: "roleId",
          value: role.id,
        },
      ]))
  )
    disabled = true;

  return (
    <YesNoCheckbox
      name={`role_${role.id}`}
      disabled={disabled}
      hideLabel
      defaultChecked={isChecked}
    />
  );
};
