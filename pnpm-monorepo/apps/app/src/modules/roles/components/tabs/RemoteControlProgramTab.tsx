"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { usePermissionsContext } from "../PermissionsContext";

export const RemoteControlProgramTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="remote_control_program">
      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Remote Control Program nutzen</h4>
          <p className="text-sm text-neutral-500">
            {getPermissionDescription("remoteControlProgram;use")}
          </p>
        </div>

        <YesNoCheckbox {...register("remoteControlProgram;use")} />
      </div>

      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Log Analyzer</h4>
          <p className="text-sm text-neutral-500">
            {getPermissionDescription("logAnalyzer;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("logAnalyzer;read")} />
      </div>
    </TabPanel>
  );
};
