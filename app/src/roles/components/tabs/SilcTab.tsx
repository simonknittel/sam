"use client";

import YesNoCheckbox from "@/common/components/form/YesNoCheckbox";
import TabPanel from "@/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const SilcTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="silc">
      <div className="py-2 flex justify-between items-center gap-2  mt-2">
        <div>
          <h4 className="font-bold">Eigenen Kontostand einsehen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können ihren eigenen SILC-Kontostand
            einsehen.
          </p>
        </div>

        <YesNoCheckbox {...register("silcBalanceOfCurrentCitizen;read")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Alle Kontostände einsehen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können die SILC-Kontoständer aller
            Citizen einsehen.
          </p>
        </div>

        <YesNoCheckbox {...register("silcBalanceOfOtherCitizen;read")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Transaktionen einsehen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können die SILC-Transaktionen aller
            Citizen einsehen.
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;read")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Transaktionen erstellen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können SILC-Transaktionen erstellen.
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;create")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Transaktionen bearbeiten und löschen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können SILC-Transaktionen bearbeiten
            und löschen
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;manage")} />
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Einstellungen bearbeiten</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können SILC-Einstellungen
            bearbeiten.
          </p>
        </div>

        <YesNoCheckbox {...register("silcSetting;manage")} />
      </div>
    </TabPanel>
  );
};
