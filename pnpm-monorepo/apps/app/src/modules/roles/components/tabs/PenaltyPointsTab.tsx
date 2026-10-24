"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { usePermissionsContext } from "../PermissionsContext";

export const PenaltyPointsTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="penalty_points">
      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Lesen</h4>
          <p className="text-sm">
            {getPermissionDescription("penaltyEntry;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eintragen</h4>
          <p className="text-sm">
            {getPermissionDescription("penaltyEntry;create")}
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;create")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Löschen</h4>
          <p className="text-sm">
            {getPermissionDescription("penaltyEntry;delete")}
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;delete")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eigene Strafpunkte lesen</h4>
          <p className="text-sm">
            {getPermissionDescription("ownPenaltyEntry;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("ownPenaltyEntry;read")} />
      </div>
    </TabPanel>
  );
};
