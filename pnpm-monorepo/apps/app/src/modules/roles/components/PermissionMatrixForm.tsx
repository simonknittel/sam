"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import clsx from "clsx";
import type { ChangeEventHandler, ReactNode } from "react";
import { updateSingleRolePermission } from "../actions/updateSingleRolePermission";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
}

export const PermissionMatrixForm = ({ children, className }: Props) => {
  const handleChange: ChangeEventHandler<HTMLFormElement> = (event) => {
    const input = event.target as unknown as HTMLInputElement;
    const [roleId, permissionString] = input.name.split("_");
    const checked = input.checked ? "true" : "";

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("permissionString", permissionString);
    formData.set("checked", checked);

    void runAction(updateSingleRolePermission, formData);
  };

  return (
    <form onChange={handleChange} className={clsx(className)}>
      {children}
    </form>
  );
};
