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
    /**
     * Split at the first underscore only: role ids are cuids and contain no
     * underscore, but permission strings can (example:
     * `taskRewardType=NEW_SILC`).
     */
    const separatorIndex = input.name.indexOf("_");
    const roleId = input.name.slice(0, separatorIndex);
    const permissionString = input.name.slice(separatorIndex + 1);
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
