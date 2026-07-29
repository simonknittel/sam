"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const WikiTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="wiki">
      <div className="py-2 flex justify-between items-center gap-2">
        <div>
          <h4 className="font-bold">Lesen</h4>
          <p className="text-sm text-neutral-400">
            Citizen mit dieser Berechtigung können das Wiki öffnen und
            öffentliche Seiten lesen. Welche weiteren Seiten sie lesen können,
            wird an den einzelnen Seiten festgelegt.
          </p>
        </div>

        <YesNoCheckbox {...register("wiki;read")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Seiten auf oberster Ebene erstellen</h4>
          <p className="text-sm text-neutral-400">
            Citizen mit dieser Berechtigung können Seiten auf der obersten Ebene
            erstellen. Unterseiten können unabhängig davon von allen erstellt
            werden, die die übergeordnete Seite bearbeiten dürfen.
          </p>
        </div>

        <YesNoCheckbox {...register("wiki;create")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Verwalten</h4>
          <p className="text-sm text-neutral-400">
            Citizen mit dieser Berechtigung können die Wiki-Einstellungen
            bearbeiten und alle Seiten unabhängig von deren Berechtigungen
            lesen, bearbeiten und verwalten.
          </p>
        </div>

        <YesNoCheckbox {...register("wiki;manage")} />
      </div>
    </TabPanel>
  );
};
