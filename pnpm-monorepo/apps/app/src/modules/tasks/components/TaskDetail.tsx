import "server-only";

import { Tile, TileVariant } from "@/modules/common/components/Tile";
import type { TaskStatus, VisibleTask } from "@sam-monorepo/application";
import clsx from "clsx";
import { CancelTask } from "./CancelTask";
import { DeleteTask } from "./DeleteTask";
import { MyTaskParticipation } from "./MyTaskParticipation";
import { TaskAudience } from "./TaskAudience";
import { TaskBriefing } from "./TaskBriefing";
import { TaskHeader } from "./TaskHeader";
import { TaskParticipants } from "./TaskParticipants";
import { TaskStatistics } from "./TaskStatistics";

interface Props {
  readonly className?: string;
  readonly task: VisibleTask;
  readonly status: TaskStatus;
  readonly currentCitizenId: string | null;
  readonly isAllowedToManageTask: boolean;
  readonly isAllowedToDeleteTask: boolean;
  readonly isTaskUpdatable: boolean;
}

/** The briefing tile takes the full width, thus a wiki can replace it later */
export const TaskDetail = ({
  className,
  task,
  status,
  currentCitizenId,
  isAllowedToManageTask,
  isAllowedToDeleteTask,
  isTaskUpdatable,
}: Props) => {
  const isEditable = isTaskUpdatable && isAllowedToManageTask;
  const isManagementShown = isEditable || isAllowedToDeleteTask;
  const taskIdAndTitle = { id: task.id, title: task.title };

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <TaskHeader task={task} status={status} isEditable={isEditable} />
        <TaskStatistics task={task} status={status} isEditable={isEditable} />
      </div>

      <div className="grid gap-2 xl:grid-cols-3">
        <MyTaskParticipation
          task={task}
          status={status}
          currentCitizenId={currentCitizenId}
          isAllowedToManageTask={isAllowedToManageTask}
        />

        <TaskParticipants
          task={task}
          isTaskUpdatable={isTaskUpdatable}
          isEditable={isEditable}
        />

        <TaskAudience task={task} isEditable={isEditable} />
      </div>

      <TaskBriefing
        task={{ id: task.id, description: task.description }}
        isEditable={isEditable}
      />

      {isManagementShown && (
        <Tile heading="Verwaltung" variant={TileVariant.Danger}>
          <div className="flex flex-wrap gap-2">
            {isEditable && (
              <CancelTask task={taskIdAndTitle} className="flex-none" />
            )}

            {isAllowedToDeleteTask && (
              <DeleteTask task={taskIdAndTitle} className="flex-none" />
            )}
          </div>
        </Tile>
      )}
    </div>
  );
};
