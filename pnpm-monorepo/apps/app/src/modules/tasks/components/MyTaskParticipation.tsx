import "server-only";

import { Tile, TileVariant } from "@/modules/common/components/Tile";
import { TaskStatus, type VisibleTask } from "@sam-monorepo/application";
import { FaCheck } from "react-icons/fa";
import { CompleteTask } from "./CompleteTask";
import { ToggleAssignmentForCurrentUser } from "./ToggleAssignmentForCurrentUser";

/** Also tells why a closed task has no actions */
const getParticipationText = (
  status: TaskStatus,
  isAssigned: boolean,
  isCompletionist: boolean,
) => {
  switch (status) {
    case TaskStatus.Open:
      return isAssigned
        ? "Du hast diesen Task angenommen."
        : "Du hast diesen Task noch nicht angenommen.";

    case TaskStatus.Completed:
      return isCompletionist
        ? "Du hast diesen Task erfüllt."
        : "Dieser Task ist erfüllt.";

    case TaskStatus.Cancelled:
      return "Dieser Task wurde abgebrochen.";

    case TaskStatus.Expired:
      return "Dieser Task ist abgelaufen.";

    default:
      throw new Error(`Unknown task status: ${status satisfies never}`);
  }
};

interface Props {
  readonly className?: string;
  readonly task: Pick<
    VisibleTask,
    | "id"
    | "visibility"
    | "assignmentLimit"
    | "assignments"
    | "requiredRoles"
    | "rewardType"
    | "canSelfComplete"
    | "completionists"
    | "hasCurrentUserRequiredRole"
  >;
  readonly status: TaskStatus;
  readonly currentCitizenId: string | null;
  readonly isAllowedToManageTask: boolean;
}

export const MyTaskParticipation = ({
  className,
  task,
  status,
  currentCitizenId,
  isAllowedToManageTask,
}: Props) => {
  const isAssigned = task.assignments.some(
    (assignment) => assignment.citizenId === currentCitizenId,
  );
  const isCompletionist = task.completionists.some(
    (completionist) => completionist.id === currentCitizenId,
  );
  const isAllowedToComplete =
    isAllowedToManageTask || (task.canSelfComplete && isAssigned);

  return (
    <Tile
      heading="Meine Teilnahme"
      variant={TileVariant.Me}
      className={className}
    >
      <p className="flex items-center gap-2">
        {(isAssigned || isCompletionist) && (
          <FaCheck className="flex-none text-me" />
        )}
        {getParticipationText(status, isAssigned, isCompletionist)}
      </p>

      {status === TaskStatus.Open && (
        <div className="mt-4 flex flex-wrap gap-2">
          <ToggleAssignmentForCurrentUser
            task={{
              id: task.id,
              visibility: task.visibility,
              assignmentLimit: task.assignmentLimit,
              assignments: task.assignments,
              requiredRoles: task.requiredRoles,
            }}
            isCurrentUserAssigned={isAssigned}
            hasCurrentUserRequiredRole={task.hasCurrentUserRequiredRole}
          />

          {isAllowedToComplete && (
            <CompleteTask
              task={{
                id: task.id,
                rewardType: task.rewardType,
                assignments: task.assignments,
              }}
              className="flex-none"
            />
          )}
        </div>
      )}
    </Tile>
  );
};
