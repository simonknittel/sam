"use client";

import { TaskRewardType, TaskVisibility } from "@/generated/prisma/browser";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { usePermissionsContext } from "../PermissionsContext";

export const TasksTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="tasks">
      <div className="border rounded-secondary border-neutral-700 p-4">
        <h4 className="font-bold text-xl">Task lesen</h4>
        <div className="py-2 flex justify-between items-center gap-2 mt-2">
          <div>
            <h4 className="font-bold">
              Öffentlich, personalisiert oder Gruppe
            </h4>
            <p className="text-sm text-neutral-400">
              Citizen mit dieser Berechtigung können öffentliche Tasks lesen
              sowie personalisierte und Gruppen-Tasks, die ihnen zugewiesen
              sind.
            </p>
          </div>

          <YesNoCheckbox {...register("task;read")} />
        </div>

        <div className="py-2 flex justify-between items-center gap-2 mt-2">
          <div>
            <h4 className="font-bold">Gelöscht</h4>
            <p className="text-sm text-neutral-400">
              Citizen mit dieser Berechtigung können gelöschte Tasks lesen.
            </p>
          </div>

          <YesNoCheckbox {...register("task;read;taskDeleted=1")} />
        </div>
      </div>

      <div className="border rounded-secondary border-neutral-700 p-4 mt-4">
        <h4 className="font-bold text-xl">Task erstellen</h4>

        <div className="py-2 flex justify-between items-center gap-2 mt-2">
          <div>
            <h4 className="font-bold">Öffentlich</h4>
            <p className="text-sm text-neutral-400">
              Citizen mit dieser Berechtigung können einen öffentlichen Task
              erstellen, welcher von allen eingesehen und angenommen werden
              kann.
            </p>
          </div>

          <YesNoCheckbox {...register("task;create")} />
        </div>

        <div className="py-2 flex justify-between items-center gap-2 mt-2">
          <div>
            <h4 className="font-bold">Personalisiert oder Gruppe</h4>
            <p className="text-sm text-neutral-400">
              Citizen mit dieser Berechtigung können einen personalisierten oder
              Gruppen-Task erstellen.
            </p>
          </div>

          <YesNoCheckbox
            {...register(
              `task;create;taskVisibility=${TaskVisibility.PERSONALIZED}`,
            )}
          />
        </div>

        <div className="py-2 flex justify-between items-center gap-2 mt-2">
          <div>
            <h4 className="font-bold">Mit neuen SILC</h4>
            <p className="text-sm text-neutral-400">
              Citizen mit dieser Berechtigung können einen personalisierten oder
              Gruppen-Task erstellen, welcher neue SILC als Belohnung hat.
            </p>
          </div>

          <YesNoCheckbox
            {...register(
              `task;create;taskVisibility=${TaskVisibility.PERSONALIZED};taskRewardType=${TaskRewardType.NEW_SILC}`,
            )}
          />
        </div>
      </div>

      <div className="py-2 flex justify-between items-center gap-2 mt-2">
        <div>
          <h4 className="font-bold">Tasks verwalten</h4>
          <p className="text-sm text-neutral-400">
            Citizen mit dieser Berechtigung können alle Arten von Tasks
            einsehen, erstellen und bearbeiten.
          </p>
        </div>

        <YesNoCheckbox {...register("task;manage")} />
      </div>
    </TabPanel>
  );
};
