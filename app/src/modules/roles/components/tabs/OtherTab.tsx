"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { type Flow, type Role } from "@prisma/client";
import { usePermissionsContext } from "../PermissionsContext";
import { CareerSection } from "./components/CareerSection";
import { RoleSection } from "./components/RoleSection";
import { SpynetSection } from "./components/SpynetSection";

interface Props {
  readonly roles: Role[];
  readonly flows: Flow[];
}

const OtherTab = ({ roles, flows }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="other">
      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Anmelden</h4>

        <YesNoCheckbox {...register("login;manage")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <div>
          <h4 className="font-bold">Gesperrt</h4>
          <p className="text-sm">Negiert Anmelden anderer Rollen</p>
        </div>

        <YesNoCheckbox {...register("login;negate")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Benutzer lesen</h4>

        <YesNoCheckbox {...register("user;read")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Datenschutzerklärung bestätigen</h4>

        <YesNoCheckbox {...register("user;manage")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Rollen inkl. Berechtigungen verwalten</h4>

        <YesNoCheckbox {...register("role;manage")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Log Analyzer</h4>

        <YesNoCheckbox {...register("logAnalyzer;read")} />
      </div>

      <div className="py-2 flex justify-between items-center">
        <h4 className="font-bold">Globale Statistiken lesen</h4>

        <YesNoCheckbox {...register("globalStatistics;read")} />
      </div>

      <CareerSection flows={flows} className="mt-2" />

      <SpynetSection className="mt-2" />

      <RoleSection roles={roles} className="mt-4" />
    </TabPanel>
  );
};

export default OtherTab;
