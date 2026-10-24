"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { usePermissionsContext } from "../PermissionsContext";

export const SilcTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="silc">
      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eigenen Kontostand einsehen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcBalanceOfCurrentCitizen;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcBalanceOfCurrentCitizen;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Alle Kontostände einsehen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcBalanceOfOtherCitizen;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcBalanceOfOtherCitizen;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">SINcome einsehen</h4>
          <p className="text-sm">
            {getPermissionDescription("profitDistributionCycle;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("profitDistributionCycle;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">SINcome verwalten</h4>
          <p className="text-sm">
            {getPermissionDescription("profitDistributionCycle;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("profitDistributionCycle;manage")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Eigene Transaktionen einsehen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcTransactionOfCurrentCitizen;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfCurrentCitizen;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Alle Transaktionen einsehen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcTransactionOfOtherCitizen;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;read")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Transaktionen erstellen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcTransactionOfOtherCitizen;create")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;create")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Transaktionen bearbeiten und löschen</h4>
          <p className="text-sm">
            {getPermissionDescription("silcTransactionOfOtherCitizen;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcTransactionOfOtherCitizen;manage")} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Einstellungen bearbeiten</h4>
          <p className="text-sm">
            {getPermissionDescription("silcSetting;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("silcSetting;manage")} />
      </div>
    </TabPanel>
  );
};
