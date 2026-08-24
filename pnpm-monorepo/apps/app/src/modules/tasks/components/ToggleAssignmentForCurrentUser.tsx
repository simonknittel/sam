"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import {
  TaskVisibility,
  type Role,
  type Task,
  type TaskAssignment,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useTransition } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { createTaskAssignmentForCurrentUser } from "../actions/createTaskAssignmentForCurrentUser";
import { deleteTaskAssignmentForCurrentUser } from "../actions/deleteTaskAssignmentForCurrentUser";

interface Props {
  readonly className?: string;
  readonly task: Task & {
    readonly assignments: readonly Pick<TaskAssignment, "citizenId">[];
    readonly requiredRoles: readonly Pick<Role, "id">[];
  };
  readonly isCurrentUserAssigned?: boolean;
}

export const ToggleAssignmentForCurrentUser = ({
  className,
  task,
  isCurrentUserAssigned,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const authentication = useAuthentication();
  if (!authentication || !authentication.session?.entity)
    throw new Error("Unauthorized");

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      await runAction(
        isCurrentUserAssigned
          ? deleteTaskAssignmentForCurrentUser
          : createTaskAssignmentForCurrentUser,
        formData,
      );
    });
  };

  const doesCurrentUserSatisfyRequirements =
    task.requiredRoles.length > 0
      ? task.requiredRoles.some((role) =>
          authentication.session.entity!.roleAssignments.some(
            (assignment) => assignment.roleId === role.id,
          ),
        )
      : true;
  const isAssignmentLimitReached =
    task.assignmentLimit && task.assignments.length >= task.assignmentLimit;
  const isPersonalizedOrGroupTask =
    task.visibility === TaskVisibility.PERSONALIZED ||
    task.visibility === TaskVisibility.GROUP;
  const disabled =
    (isCurrentUserAssigned && isPersonalizedOrGroupTask) ||
    (!isCurrentUserAssigned && isPersonalizedOrGroupTask) ||
    (!isCurrentUserAssigned && isAssignmentLimitReached) ||
    (!isCurrentUserAssigned && !doesCurrentUserSatisfyRequirements);

  const button = (
    <Button2 disabled={disabled}>
      {isCurrentUserAssigned ? "Aufgeben" : "Annehmen"}
      {isPending ? (
        <AsciiSpinner />
      ) : isCurrentUserAssigned ? (
        <FaMinus />
      ) : (
        <FaPlus />
      )}
    </Button2>
  );

  return (
    <form action={formAction} id={formId} className={clsx(className)}>
      <input type="hidden" name="taskId" value={task.id} />

      {disabled ? (
        <Tooltip asChild triggerChildren={button}>
          <div className="flex flex-col gap-4">
            {isCurrentUserAssigned && isPersonalizedOrGroupTask && (
              <p>
                Du kannst personalisierte und Gruppen-Tasks nicht selbstständig
                aufgeben.
              </p>
            )}

            {!isCurrentUserAssigned && isPersonalizedOrGroupTask && (
              <p>
                Du kannst personalisierte und Gruppen-Tasks von anderen nicht
                annehmen.
              </p>
            )}

            {!isCurrentUserAssigned && isAssignmentLimitReached && (
              <p>
                Du kannst diesen Task nicht annehmen, da das Teilnehmerlimit
                erreicht ist.
              </p>
            )}

            {!isCurrentUserAssigned && !doesCurrentUserSatisfyRequirements && (
              <div className="flex flex-col gap-1">
                <p>
                  Du kannst diesen Task nicht annehmen, da dir die folgenden
                  Rollen fehlen:
                </p>

                {task.requiredRoles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Erforderliche Rollen
                    </p>
                    <div className="flex flex-col items-start gap-1 mt-1">
                      {task.requiredRoles.map((role) => (
                        <SingleRoleBadge key={role.id} roleId={role.id} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Tooltip>
      ) : (
        button
      )}
    </form>
  );
};
