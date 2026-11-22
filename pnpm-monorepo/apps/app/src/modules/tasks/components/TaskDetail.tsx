import "server-only";

import { Markdown } from "@/modules/common/components/Markdown";
import { Tile, TileVariant } from "@/modules/common/components/Tile";
import type { TaskStatus, VisibleTask } from "@sam-monorepo/application";
import clsx from "clsx";
import { CancelTask } from "./CancelTask";
import { DeleteTask } from "./DeleteTask";
import { MyTaskParticipation } from "./MyTaskParticipation";
import { TaskAudience } from "./TaskAudience";
import { TaskHeader } from "./TaskHeader";
import { TaskParticipants } from "./TaskParticipants";
import { TaskStatistics } from "./TaskStatistics";
import { UpdateTaskDescription } from "./UpdateTaskDescription";

interface Props {
  readonly className?: string;
  readonly task: VisibleTask;
  readonly status: TaskStatus;
  readonly currentCitizenId: string | null;
  readonly isAllowedToManageTask: boolean;
  readonly isAllowedToDeleteTask: boolean;
  readonly isTaskUpdatable: boolean;
}

/**
 * The task page: the head with the key figures, the own participation, the
 * participants and the audience, then the description as the briefing. The
 * briefing tile takes the full width, thus a wiki can replace it later, like
 * on the variant pages.
 */
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
  /** The client components get only their fields, not the description */
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

      <Tile heading="Briefing">
        {isEditable ? (
          <UpdateTaskDescription
            task={{ id: task.id, description: task.description }}
          />
        ) : (
          <Markdown>{task.description || "-"}</Markdown>
        )}
      </Tile>

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
