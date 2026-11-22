import { Tile } from "@/modules/common/components/Tile";
import type { VisibleTask } from "@sam-monorepo/application";
import { TaskVisibility } from "@sam-monorepo/database/client";
import { TaskCitizenListItem } from "./TaskCitizenListItem";
import { UpdateTaskAssignments } from "./UpdateTaskAssignments";

interface Props {
  readonly className?: string;
  readonly task: Pick<
    VisibleTask,
    "id" | "visibility" | "assignmentLimit" | "assignments" | "completionists"
  >;
  /** Whether the task is still open */
  readonly isTaskUpdatable: boolean;
  /** Shows the editor of the assignments */
  readonly isEditable: boolean;
}

/** The citizens who accepted the task, its free places and its completionists */
export const TaskParticipants = ({
  className,
  task,
  isTaskUpdatable,
  isEditable,
}: Props) => {
  const isPublic = task.visibility === TaskVisibility.PUBLIC;
  /** Zero is no limit */
  const freePlaces =
    isPublic && isTaskUpdatable && task.assignmentLimit
      ? Math.max(task.assignmentLimit - task.assignments.length, 0)
      : 0;

  return (
    <Tile
      heading="Teilnehmer"
      cta={
        isEditable &&
        isPublic && (
          <UpdateTaskAssignments
            task={{
              id: task.id,
              assignmentLimit: task.assignmentLimit,
              assignments: task.assignments,
            }}
          />
        )
      }
      className={className}
    >
      {task.assignments.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {task.assignments.map((assignment) => (
            <TaskCitizenListItem
              key={assignment.id}
              citizen={assignment.citizen}
            />
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500">
          Noch niemand hat diesen Task angenommen.
        </p>
      )}

      {freePlaces > 0 && (
        <p className="mt-1 rounded-secondary border border-dashed border-white/20 px-2 py-2 text-sm text-neutral-400">
          {freePlaces === 1
            ? "Noch 1 Platz frei"
            : `Noch ${freePlaces} Plätze frei`}
        </p>
      )}

      {task.completionists.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 font-mono text-xs text-neutral-500 uppercase">
            Erfüllt durch
          </h3>

          <ul className="flex flex-col gap-1">
            {task.completionists.map((completionist) => (
              <TaskCitizenListItem
                key={completionist.id}
                citizen={completionist}
              />
            ))}
          </ul>
        </>
      )}
    </Tile>
  );
};
