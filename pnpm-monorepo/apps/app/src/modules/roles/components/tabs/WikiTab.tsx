"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { usePermissionsContext } from "../PermissionsContext";

export const WikiTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="wiki">
      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Seiten auf oberster Ebene erstellen</h4>
          <p className="text-sm text-neutral-400">
            {getPermissionDescription("wiki;create")}
          </p>
        </div>

        <YesNoCheckbox {...register("wiki;create")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Verwalten</h4>
          <p className="text-sm text-neutral-400">
            {getPermissionDescription("wiki;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("wiki;manage")} />
      </div>
    </TabPanel>
  );
};
