"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

const EventsTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="events">
      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Events lesen</h4>

        <YesNoCheckbox {...register("event;read")} />
      </div>

      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Events erstellen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können eigene Events in der App
            erstellen und diese als Organisator verwalten.
          </p>
        </div>

        <YesNoCheckbox {...register("event;create")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Events verwalten</h4>

        <YesNoCheckbox {...register("event;manage")} />
      </div>

      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Event-Vorlagen teilen</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können ihre eigenen Event-Vorlagen
            für Rollen freigeben und den Besitz an andere Citizen übertragen.
          </p>
        </div>

        <YesNoCheckbox {...register("eventTemplateShare;manage")} />
      </div>

      <div className="flex items-center justify-between py-2">
        <h4 className="font-bold">Event-Flotte lesen</h4>

        <YesNoCheckbox {...register("eventFleet;read")} />
      </div>

      <div className="flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Aufstellung - Posten verwalten</h4>
          <p className="text-sm">
            Citizen mit dieser Berechtigung können die Posten der
            Eventaufstellung bearbeiten, selbst wenn sie nicht Organisator des
            Events sind.
          </p>
        </div>

        <YesNoCheckbox {...register("othersEventPosition;manage")} />
      </div>
    </TabPanel>
  );
};

export default EventsTab;
