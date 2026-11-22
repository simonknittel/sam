import "server-only";

import { EditableDateTimeInput } from "@/modules/common/components/form/EditableDateTimeInput";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { formatDate } from "@/modules/common/utils/formatDate";
import { TaskStatus, type VisibleTask } from "@sam-monorepo/application";
import { TaskVisibility } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { FaInfoCircle } from "react-icons/fa";
import { updateTaskExpiresAt } from "../actions/updateTaskExpiresAt";
import { TaskRewardStatistic } from "./TaskRewardStatistic";
import { UpdateTaskRepeatable } from "./UpdateTaskRepeatable";

interface Props {
  readonly className?: string;
  readonly task: Pick<
    VisibleTask,
    | "id"
    | "visibility"
    | "assignmentLimit"
    | "assignments"
    | "expiresAt"
    | "repeatable"
    | "rewardType"
    | "rewardSilcValue"
    | "rewardTypeTextValue"
  >;
  readonly status: TaskStatus;
  /** Shows the inline editors of the values */
  readonly isEditable: boolean;
}

/** The key figures of a task in one row of tiles */
export const TaskStatistics = ({
  className,
  task,
  status,
  isEditable,
}: Props) => {
  /** The end date of a completed or cancelled task has no effect anymore */
  const isEndDateRelevant =
    status === TaskStatus.Open || status === TaskStatus.Expired;
  /**
   * Only a public task has a limit of the citizens that accept it. Zero is
   * no limit.
   */
  const assignmentLimit =
    task.visibility === TaskVisibility.PUBLIC && task.assignmentLimit
      ? task.assignmentLimit
      : null;

  return (
    <div className={clsx("grid grid-cols-2 gap-0.5 lg:grid-cols-4", className)}>
      <TaskRewardStatistic task={task} isEditable={isEditable} />

      <StatisticTile
        label={assignmentLimit === null ? "Teilnehmer" : "Plätze belegt"}
      >
        {task.assignments.length}
        {assignmentLimit !== null && (
          <span className="text-neutral-500"> / {assignmentLimit}</span>
        )}
      </StatisticTile>

      <StatisticTile
        label="Ablaufdatum"
        secondaryValue={
          isEditable ? (
            <EditableDateTimeInput
              rowId={task.id}
              columnName="expiresAt"
              initialValue={task.expiresAt}
              action={updateTaskExpiresAt}
            />
          ) : (
            formatDate(task.expiresAt)
          )
        }
      >
        {!task.expiresAt && "Keins"}
        {task.expiresAt && isEndDateRelevant && (
          <RelativeDate date={task.expiresAt} />
        )}
        {task.expiresAt && !isEndDateRelevant && "-"}
      </StatisticTile>

      <StatisticTile
        label={
          <span className="inline-flex items-center gap-1">
            Wiederholungen
            <Tooltip triggerChildren={<FaInfoCircle />}>
              Wie häufig kann dieser Task abgeschlossen werden?
            </Tooltip>
          </span>
        }
      >
        {/* The pen has the size of the pens of the inline editors */}
        <span className="inline-flex items-center gap-2">
          {task.repeatable}×
          {isEditable && (
            <UpdateTaskRepeatable
              task={{ id: task.id, repeatable: task.repeatable }}
              className="text-sm"
            />
          )}
        </span>
      </StatisticTile>
    </div>
  );
};
