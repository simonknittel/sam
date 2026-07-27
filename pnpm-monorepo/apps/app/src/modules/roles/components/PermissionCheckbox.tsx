"use client";

import type { Role } from "@/generated/prisma/browser";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { memo } from "react";
import { usePermissionsContext } from "./PermissionsContext";

interface Props {
  readonly roleId: Role["id"];
  readonly permissionString: string;
}

export const PermissionCheckbox = memo(function PermissionCheckbox({
  roleId,
  permissionString,
}: Props) {
  const { permissionStrings } = usePermissionsContext();

  return (
    <td>
      <YesNoCheckbox
        name={`${roleId}_${permissionString}`}
        defaultChecked={permissionStrings.includes(permissionString)}
        yesLabel=""
        noLabel=""
      />
    </td>
  );
});
