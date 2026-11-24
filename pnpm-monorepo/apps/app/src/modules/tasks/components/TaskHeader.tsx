import "server-only";

import { Badge } from "@/modules/common/components/Badge";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { formatDate } from "@/modules/common/utils/formatDate";
import { TaskStatus, type VisibleTask } from "@sam-monorepo/application";
import clsx from "clsx";
import type { ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheckSquare, FaInfoCircle, FaRegCircle } from "react-icons/fa";
import { updateTaskTitle } from "../actions/updateTaskTitle";

interface StatusPresentation {
  readonly label: string;
  readonly icon: ReactNode;
  readonly textClassName?: string;
  readonly surfaceClassName: string;
}

/** The colours and icons agree with the status badges of the task list */
const STATUS_PRESENTATIONS: Record<TaskStatus, StatusPresentation> = {
  [TaskStatus.Open]: {
    label: "Offen",
    icon: <FaRegCircle />,
    surfaceClassName: "bg-secondary",
  },
  [TaskStatus.Completed]: {
    label: "Erfüllt",
    icon: <FaCheckSquare />,
    textClassName: "text-green-500",
    surfaceClassName:
      "tile-accent-surface [--tile-accent-color:var(--color-green-500)]",
  },
  [TaskStatus.Cancelled]: {
    label: "Abgebrochen",
    icon: <FaInfoCircle />,
    textClassName: "text-blue-500",
    surfaceClassName:
      "tile-accent-surface [--tile-accent-color:var(--color-blue-500)]",
  },
  [TaskStatus.Expired]: {
    label: "Abgelaufen",
    icon: <BsExclamationOctagonFill />,
    textClassName: "text-red-500",
    surfaceClassName:
      "tile-accent-surface [--tile-accent-color:var(--color-red-500)]",
  },
};

type HeaderTask = Pick<
  VisibleTask,
  | "id"
  | "title"
  | "createdAt"
  | "createdBy"
  | "completedAt"
  | "cancelledAt"
  | "expiresAt"
>;

const getClosingText = (task: HeaderTask, status: TaskStatus) => {
  switch (status) {
    case TaskStatus.Open:
      return null;

    case TaskStatus.Completed:
      return `Erfüllt am ${formatDate(task.completedAt)}`;

    case TaskStatus.Cancelled:
      return `Abgebrochen am ${formatDate(task.cancelledAt)}`;

    case TaskStatus.Expired:
      return `Abgelaufen am ${formatDate(task.expiresAt)}`;

    default:
      throw new Error(`Unknown task status: ${status satisfies never}`);
  }
};

interface Props {
  readonly className?: string;
  readonly task: HeaderTask;
  readonly status: TaskStatus;
  readonly isEditable: boolean;
}

export const TaskHeader = ({ className, task, status, isEditable }: Props) => {
  const presentation = STATUS_PRESENTATIONS[status];
  const closingText = getClosingText(task, status);

  return (
    <section
      className={clsx(
        "flex flex-col items-start gap-3 corners-primary p-4",
        presentation.surfaceClassName,
        className,
      )}
    >
      <Badge
        label="Status"
        value={presentation.label}
        icon={presentation.icon}
        className={clsx("text-sm", presentation.textClassName)}
      />

      {/* A row: the editor of the title stays next to the prefix */}
      <h1 className="flex w-full items-baseline gap-2 font-mono text-2xl font-bold wrap-break-word">
        <span className="flex-none text-neutral-500 uppercase">Task //</span>
        {isEditable ? (
          <EditableInput
            rowId={task.id}
            columnName="title"
            initialValue={task.title}
            action={updateTaskTitle}
            className="min-w-0 flex-1"
            fillWidth
          />
        ) : (
          <span className="min-w-0">{task.title}</span>
        )}
      </h1>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
        <span>
          Erstellt
          {task.createdBy && (
            <>
              {" "}
              von <CitizenLink citizen={task.createdBy} />
            </>
          )}{" "}
          am {formatDate(task.createdAt)}
        </span>

        {closingText && <span>{closingText}</span>}
      </p>
    </section>
  );
};
