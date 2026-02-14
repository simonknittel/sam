"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { Badge } from "@/modules/common/components/Badge";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableDateTimeInput } from "@/modules/common/components/form/EditableDateTimeInput";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { EditableTextarea } from "@/modules/common/components/form/EditableTextarea";
import { Markdown } from "@/modules/common/components/Markdown";
import { Tile } from "@/modules/common/components/Tile";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { formatDate } from "@/modules/common/utils/formatDate";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import {
  TaskRewardType,
  TaskVisibility,
  type Entity,
  type Role,
  type Task,
  type TaskAssignment,
  type Upload,
} from "@prisma/client";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { FaEye, FaInfoCircle } from "react-icons/fa";
import { updateTaskDescription } from "../actions/updateTaskDescription";
import { updateTaskExpiresAt } from "../actions/updateTaskExpiresAt";
import { updateTaskRewardTypeNewSilcValue } from "../actions/updateTaskRewardTypeNewSilcValue";
import { updateTaskRewardTypeSilcValue } from "../actions/updateTaskRewardTypeSilcValue";
import { updateTaskRewardTypeTextValue } from "../actions/updateTaskRewardTypeTextValue";
import { updateTaskTitle } from "../actions/updateTaskTitle";
import { CancelTask } from "./CancelTask";
import { CompleteTask } from "./CompleteTask";
import { DeleteTask } from "./DeleteTask";
import { ToggleAssignmentForCurrentUser } from "./ToggleAssignmentForCurrentUser";
import { UpdateRequiredRoles } from "./UpdateRequiredRoles";
import { UpdateTaskAssignments } from "./UpdateTaskAssignments";
import { UpdateTaskRepeatable } from "./UpdateTaskRepeatable";

interface TaskWithIncludes extends Task {
  createdBy: Entity | null;
  assignments: (TaskAssignment & {
    citizen: Entity;
  })[];
  completedBy?: Entity | null;
  completionists?: Entity[];
  cancelledBy?: Entity | null;
  deletedBy?: Entity | null;
  requiredRoles: (Role & {
    icon: Upload | null;
  })[];
}

interface Props {
  readonly className?: string;
  readonly task: TaskWithIncludes;
}

interface Props {
  readonly className?: string;
  readonly task: TaskWithIncludes;
  readonly isAllowedToManageTask: boolean;
  readonly isAllowedToDeleteTask: boolean;
  readonly isTaskUpdatable: boolean;
}

export const Overview = ({
  className,
  task,
  isAllowedToManageTask,
  isAllowedToDeleteTask,
  isTaskUpdatable,
}: Props) => {
  const authentication = useAuthentication();
  if (!authentication) forbidden();

  const isCurrentUserAssigned = task.assignments.some(
    (assignment) => assignment.citizenId === authentication.session.entity?.id,
  );
  const isAllowedToSelfCompleteTask =
    task.canSelfComplete && isCurrentUserAssigned;

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      <div className="text-2xl font-bold">
        {isTaskUpdatable && isAllowedToManageTask ? (
          <EditableInput
            rowId={task.id}
            columnName="title"
            initialValue={task.title}
            action={updateTaskTitle}
          />
        ) : (
          <span>{task.title}</span>
        )}
      </div>

      <Tile heading="Beschreibung">
        {isTaskUpdatable && isAllowedToManageTask ? (
          <EditableTextarea
            rowId={task.id}
            columnName="description"
            initialValue={task.description}
            action={updateTaskDescription}
          />
        ) : (
          <Markdown>{task.description || "-"}</Markdown>
        )}
      </Tile>

      <Tile heading="Zielgruppe">
        <div className="flex flex-col gap-4">
          <div>
            {task.visibility === TaskVisibility.PUBLIC && (
              <Badge
                key="visibility"
                label="Sichtbarkeit"
                value="Öffentlich"
                icon={<FaEye />}
                className="text-sm"
              />
            )}

            {task.visibility === TaskVisibility.PERSONALIZED && (
              <Badge
                key="visibility"
                label="Sichtbarkeit"
                value="Personalisiert"
                icon={<FaEye />}
                className="text-sm"
              />
            )}

            {task.visibility === TaskVisibility.GROUP && (
              <Badge
                key="visibility"
                label="Sichtbarkeit"
                value="Gruppe"
                icon={<FaEye />}
                className="text-sm"
              />
            )}
          </div>

          {task.visibility === TaskVisibility.PUBLIC && (
            <div className="flex flex-col items-start">
              <span className="text-neutral-400 text-sm">Teilnehmerlimit</span>
              <div className="flex gap-2 items-center">
                {task.assignmentLimit ? task.assignmentLimit : "-"}
                {isTaskUpdatable && isAllowedToManageTask && (
                  <UpdateTaskAssignments task={task} className="flex-none" />
                )}
              </div>
            </div>
          )}

          {task.visibility === TaskVisibility.PUBLIC && (
            <div className="flex flex-col items-start">
              <span className="text-neutral-400 text-sm">
                Erforderliche Rolle(n)
              </span>

              <div className="flex gap-2 items-center">
                {task.requiredRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.requiredRoles.map((role) => (
                      <SingleRoleBadge
                        key={role.id}
                        roleId={role.id}
                        showPlaceholder
                      />
                    ))}
                  </div>
                ) : (
                  "-"
                )}

                {isTaskUpdatable && isAllowedToManageTask && (
                  <UpdateRequiredRoles task={task} className="flex-none" />
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-start">
            <span className="text-neutral-400 text-sm">Angenommen von</span>
            <div className="flex gap-2 items-center">
              {task.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {task.assignments.map((assignment) => (
                    <CitizenLink
                      key={assignment.id}
                      citizen={assignment.citizen}
                    />
                  ))}
                </div>
              ) : (
                "-"
              )}
              {isTaskUpdatable &&
                isAllowedToManageTask &&
                task.visibility === TaskVisibility.PUBLIC && (
                  <UpdateTaskAssignments task={task} className="flex-none" />
                )}
            </div>
          </div>

          {(task.visibility === TaskVisibility.PERSONALIZED ||
            task.visibility === TaskVisibility.GROUP) && (
            <div className="flex flex-col items-start">
              <span className="text-neutral-400 text-sm">
                Kann selbstständig abgeschlossen werden
              </span>

              <div className="flex gap-2 items-center">
                {task.canSelfComplete ? "Ja" : "Nein"}
              </div>
            </div>
          )}
        </div>
      </Tile>

      <Tile heading="Belohnung">
        {task.rewardType === TaskRewardType.TEXT &&
          (isTaskUpdatable && isAllowedToManageTask ? (
            <EditableTextarea
              rowId={task.id}
              columnName="rewardTypeTextValue"
              initialValue={task.rewardTypeTextValue || ""}
              action={updateTaskRewardTypeTextValue}
            />
          ) : (
            <Markdown>{task.rewardTypeTextValue || "-"}</Markdown>
          ))}
        {task.rewardType === TaskRewardType.SILC &&
          (isTaskUpdatable && isAllowedToManageTask ? (
            <div className="flex gap-2">
              <EditableInput
                type="number"
                rowId={task.id}
                columnName="rewardTypeSilcValue"
                initialValue={task.rewardTypeSilcValue || 1}
                action={updateTaskRewardTypeSilcValue}
                className="flex-initial"
              />
              <span className="flex-none">SILC (Tausch)</span>
            </div>
          ) : (
            <span>{task.rewardTypeSilcValue} SILC (Tausch)</span>
          ))}
        {task.rewardType === TaskRewardType.NEW_SILC &&
          (isTaskUpdatable && isAllowedToManageTask ? (
            <div className="flex gap-2">
              <EditableInput
                type="number"
                rowId={task.id}
                columnName="rewardTypeNewSilcValue"
                initialValue={task.rewardTypeNewSilcValue || 1}
                action={updateTaskRewardTypeNewSilcValue}
                className="flex-initial"
              />
              <span className="flex-none">SILC</span>
            </div>
          ) : (
            <span>{task.rewardTypeNewSilcValue} SILC</span>
          ))}
      </Tile>

      <Tile heading="Zusatzinformationen">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex flex-col items-start">
              <span className="text-neutral-400 text-sm flex items-center gap-1">
                Wiederholungen
                <Tooltip triggerChildren={<FaInfoCircle />}>
                  Wie häufig kann dieser Task abgeschlossen werden?
                </Tooltip>
              </span>
              <div className="flex gap-2 items-center">
                {task.repeatable}x
                {isTaskUpdatable && isAllowedToManageTask && (
                  <UpdateTaskRepeatable task={task} />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col items-start">
              <span className="text-neutral-400 text-sm">Erstellt von</span>
              {task.createdBy && <CitizenLink citizen={task.createdBy} />}
            </div>

            <div className="flex flex-col">
              <span className="text-neutral-400 text-sm">Erstellt am</span>
              {formatDate(task.createdAt)}
            </div>

            <div className="flex flex-col">
              <span className="text-neutral-400 text-sm">Ablaufdatum</span>
              {isTaskUpdatable && isAllowedToManageTask ? (
                <EditableDateTimeInput
                  rowId={task.id}
                  columnName="expiresAt"
                  initialValue={task.expiresAt}
                  action={updateTaskExpiresAt}
                />
              ) : (
                formatDate(task.expiresAt) || "-"
              )}
            </div>
          </div>

          {(task.completedBy ||
            task.cancelledBy ||
            task.deletedBy ||
            (task.completionists && task.completionists.length > 0)) && (
            <div className="flex gap-2">
              {task.completedBy && (
                <>
                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Abgeschlossen von
                    </span>
                    <div className="flex gap-2 items-center">
                      <CitizenLink citizen={task.completedBy} />
                    </div>
                  </div>

                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Abgeschlossen am
                    </span>
                    <div className="flex gap-2 items-center">
                      {formatDate(task.completedAt)}
                    </div>
                  </div>
                </>
              )}
              {task.cancelledBy && (
                <>
                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Abgebrochen von
                    </span>
                    <div className="flex gap-2 items-center">
                      <CitizenLink citizen={task.cancelledBy} />
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Abgebrochen am
                    </span>
                    <div className="flex gap-2 items-center">
                      {formatDate(task.cancelledAt)}
                    </div>
                  </div>
                </>
              )}
              {task.deletedBy && (
                <>
                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Gelöscht von
                    </span>
                    <div className="flex gap-2 items-center">
                      <CitizenLink citizen={task.deletedBy} />
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-neutral-400 text-sm">
                      Gelöscht am
                    </span>
                    <div className="flex gap-2 items-center">
                      {formatDate(task.deletedAt)}
                    </div>
                  </div>
                </>
              )}
              {task.completionists && task.completionists.length > 0 && (
                <div className="flex flex-col items-start">
                  <span className="text-neutral-400 text-sm">
                    Erfüllt durch
                  </span>

                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {task.completionists.map((completionist) => (
                      <CitizenLink
                        key={completionist.id}
                        citizen={completionist}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Tile>

      {(isTaskUpdatable ||
        (isTaskUpdatable &&
          (isAllowedToManageTask || isAllowedToSelfCompleteTask)) ||
        isAllowedToDeleteTask) && (
        <Tile heading="Aktionen">
          <div className="flex flex-wrap gap-2">
            {isTaskUpdatable && (
              <ToggleAssignmentForCurrentUser
                task={task}
                isCurrentUserAssigned={isCurrentUserAssigned}
              />
            )}

            {(isAllowedToManageTask || isAllowedToSelfCompleteTask) &&
              isTaskUpdatable && (
                <CompleteTask task={task} className="flex-none" />
              )}

            {isAllowedToManageTask && isTaskUpdatable && (
              <CancelTask task={task} className="flex-none" />
            )}

            {isAllowedToDeleteTask && (
              <DeleteTask task={task} className="flex-none" />
            )}
          </div>
        </Tile>
      )}
    </div>
  );
};
