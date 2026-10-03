"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

const FleetTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="fleet">
      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Gesamte Flotte einsehen</h4>

        <YesNoCheckbox {...register("orgFleet;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Schiffe anderer Citizen einsehen</h4>

        <YesNoCheckbox {...register("otherShips;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Eigene Schiffe verwalten</h4>

        <YesNoCheckbox {...register("ship;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Schiffsmodelle verwalten</h4>

        <YesNoCheckbox {...register("manufacturersSeriesAndVariants;manage")} />
      </div>
    </TabPanel>
  );
};

export default FleetTab;
