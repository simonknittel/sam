"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const PenaltyPointsTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="penalty_points">
      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Lesen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können Strafpunkte von anderen
            Citizen lesen.
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eintragen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können Strafpunkte bei anderen
            Citizen eintragen.
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;create")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Löschen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können Strafpunkte bei anderen
            Citizen löschen. Dies sollte nur in Ausnahmefällen verwendet werden.
            Wenn Strafpunkte selbstständig ablaufen sollen, sollte stattdessen
            für den Eintrag ein Verfallsdatum angegeben werden.
          </p>
        </div>

        <YesNoCheckbox {...register("penaltyEntry;delete")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eigene Strafpunkte lesen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können ihre eigenen Strafpunkte
            lesen.
          </p>
        </div>

        <YesNoCheckbox {...register("ownPenaltyEntry;read")} />
      </div>
    </TabPanel>
  );
};
