"use client";

import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/browser";
import { getPermissionDescription } from "@sam-monorepo/domain";
import { usePermissionsContext } from "../PermissionsContext";

export const TasksTab = () => {
  const { register } = usePermissionsContext();

  return (
    <TabPanel id="tasks">
      <div className="rounded-secondary border border-neutral-700 p-4">
        <h4 className="text-xl font-bold">Task lesen</h4>
        <div className="mt-2 flex items-center justify-between gap-2 py-2">
          <div>
            <h4 className="font-bold">
              Öffentlich, personalisiert oder Gruppe
            </h4>
            <p className="text-sm text-neutral-400">
              {getPermissionDescription("task;read")}
            </p>
          </div>

          <YesNoCheckbox {...register("task;read")} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 py-2">
          <div>
            <h4 className="font-bold">Gelöscht</h4>
            <p className="text-sm text-neutral-400">
              {getPermissionDescription("task;read;taskDeleted=1")}
            </p>
          </div>

          <YesNoCheckbox {...register("task;read;taskDeleted=1")} />
        </div>
      </div>

      <div className="mt-4 rounded-secondary border border-neutral-700 p-4">
        <h4 className="text-xl font-bold">Task erstellen</h4>

        <div className="mt-2 flex items-center justify-between gap-2 py-2">
          <div>
            <h4 className="font-bold">Öffentlich</h4>
            <p className="text-sm text-neutral-400">
              {getPermissionDescription("task;create")}
            </p>
          </div>

          <YesNoCheckbox {...register("task;create")} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 py-2">
          <div>
            <h4 className="font-bold">Personalisiert oder Gruppe</h4>
            <p className="text-sm text-neutral-400">
              {getPermissionDescription(
                `task;create;taskVisibility=${TaskVisibility.PERSONALIZED}`,
              )}
            </p>
          </div>

          <YesNoCheckbox
            {...register(
              `task;create;taskVisibility=${TaskVisibility.PERSONALIZED}`,
            )}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 py-2">
          <div>
            <h4 className="font-bold">Mit neuen SILC</h4>
            <p className="text-sm text-neutral-400">
              {getPermissionDescription(
                `task;create;taskVisibility=${TaskVisibility.PERSONALIZED};taskRewardType=${TaskRewardType.NEW_SILC}`,
              )}
            </p>
          </div>

          <YesNoCheckbox
            {...register(
              `task;create;taskVisibility=${TaskVisibility.PERSONALIZED};taskRewardType=${TaskRewardType.NEW_SILC}`,
            )}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 py-2">
        <div>
          <h4 className="font-bold">Tasks verwalten</h4>
          <p className="text-sm text-neutral-400">
            {getPermissionDescription("task;manage")}
          </p>
        </div>

        <YesNoCheckbox {...register("task;manage")} />
      </div>
    </TabPanel>
  );
};
