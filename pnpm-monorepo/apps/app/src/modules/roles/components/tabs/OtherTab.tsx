"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { type Role } from "@sam-monorepo/database/browser";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { FaInfoCircle } from "react-icons/fa";
import { usePermissionsContext } from "../PermissionsContext";
import { RoleSection } from "./components/RoleSection";
import { SpynetSection } from "./components/SpynetSection";

interface Props {
  readonly roles: readonly Pick<Role, "id" | "name">[];
}

const OtherTab = ({ roles }: Readonly<Props>) => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="other">
      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Anmelden</h4>

        <YesNoCheckbox {...register("login;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">Gesperrt</h4>
          <p className="text-sm">{getPermissionDescription("login;negate")}</p>
        </div>

        <YesNoCheckbox {...register("login;negate")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Benutzer lesen</h4>

        <YesNoCheckbox {...register("user;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Datenschutzerklärung bestätigen</h4>

        <YesNoCheckbox {...register("user;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Rollen inkl. Berechtigungen verwalten</h4>

        <YesNoCheckbox {...register("role;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Log Analyzer</h4>

        <YesNoCheckbox {...register("logAnalyzer;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">MCP-Server nutzen</h4>
          <p className="text-sm text-neutral-500">
            {getPermissionDescription("mcp;use")}
          </p>
        </div>

        <YesNoCheckbox {...register("mcp;use")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">System Log lesen</h4>
          <p className="text-sm text-yellow-500">
            {getPermissionDescription("systemLog;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("systemLog;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">Globale Statistiken lesen</h4>
          <p className="text-sm">
            {getPermissionDescription("globalStatistics;read")}
          </p>
        </div>

        <YesNoCheckbox {...register("globalStatistics;read")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">Uploads verwalten</h4>
          <p className="text-sm">{getPermissionDescription("upload;manage")}</p>
        </div>

        <YesNoCheckbox {...register("upload;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <h4 className="font-bold">Benachrichtigungen</h4>
          <p className="text-sm">
            {getPermissionDescription("manualNotification;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("manualNotification;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold">Karrierebäume verwalten</h4>

          <Tooltip triggerChildren={<FaInfoCircle />}>
            {getPermissionDescription("career;manage")}
          </Tooltip>
        </div>

        <YesNoCheckbox {...register("career;manage")} />
      </div>

      <SpynetSection className="mt-2" />

      <RoleSection roles={roles} className="mt-4" />
    </TabPanel>
  );
};

export default OtherTab;
