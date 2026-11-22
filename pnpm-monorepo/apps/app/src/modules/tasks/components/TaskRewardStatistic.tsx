import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { EditableTextarea } from "@/modules/common/components/form/EditableTextarea";
import { Markdown } from "@/modules/common/components/Markdown";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import type { VisibleTask } from "@sam-monorepo/application";
import { TaskRewardType } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { updateTaskRewardSilcValue } from "../actions/updateTaskRewardSilcValue";
import { updateTaskRewardTypeTextValue } from "../actions/updateTaskRewardTypeTextValue";

const LABEL = "Belohnung";

interface Props {
  readonly className?: string;
  readonly task: Pick<
    VisibleTask,
    "id" | "rewardType" | "rewardSilcValue" | "rewardTypeTextValue"
  >;
  /** Shows the value as an inline editor */
  readonly isEditable: boolean;
}

/**
 * The reward of a task in the row of key figures: a SILC reward as a big
 * number, a text reward as text
 */
export const TaskRewardStatistic = ({ className, task, isEditable }: Props) => {
  switch (task.rewardType) {
    case TaskRewardType.SILC:
    case TaskRewardType.NEW_SILC:
      return (
        <StatisticTile
          label={LABEL}
          /** The creator of a SILC task pays the reward (see the schema) */
          secondaryValue={
            task.rewardType === TaskRewardType.SILC ? "SILC (Tausch)" : "SILC"
          }
          className={className}
        >
          {isEditable ? (
            <EditableInput
              type="number"
              rowId={task.id}
              columnName="rewardSilcValue"
              initialValue={task.rewardSilcValue ?? 1}
              action={updateTaskRewardSilcValue}
            />
          ) : (
            task.rewardSilcValue
          )}
        </StatisticTile>
      );

    case TaskRewardType.TEXT:
      return (
        /**
         * A section with a heading, not a StatisticTile: the text does not
         * fit the big letters of a number. The reverse order shows the
         * heading below the value, like the labels of the other tiles.
         */
        <section
          className={clsx(
            "flex flex-col-reverse items-center justify-center gap-1 rounded-primary bg-secondary p-4 text-center",
            className,
          )}
        >
          <h2 className="text-white/20">{LABEL}</h2>

          {isEditable ? (
            <EditableTextarea
              rowId={task.id}
              columnName="rewardTypeTextValue"
              initialValue={task.rewardTypeTextValue || ""}
              action={updateTaskRewardTypeTextValue}
              className="max-w-full"
            />
          ) : (
            <Markdown>{task.rewardTypeTextValue || "-"}</Markdown>
          )}
        </section>
      );

    default:
      throw new Error(
        `Unknown task reward type: ${task.rewardType satisfies never}`,
      );
  }
};
