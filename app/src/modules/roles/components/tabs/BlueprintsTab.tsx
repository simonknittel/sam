"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const BlueprintsTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="blueprints">
      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Blueprints App öffnen</h4>

        <YesNoCheckbox {...register("blueprint;read")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Eigene Blueprints verwalten</h4>

        <YesNoCheckbox {...register("myBlueprint;manage")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Blueprints von anderen lesen</h4>

        <YesNoCheckbox {...register("otherBlueprint;read")} />
      </div>
    </TabPanel>
  );
};
