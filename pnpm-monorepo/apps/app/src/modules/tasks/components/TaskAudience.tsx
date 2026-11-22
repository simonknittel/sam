import { Tile } from "@/modules/common/components/Tile";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import type { VisibleTask } from "@sam-monorepo/application";
import { TaskVisibility } from "@sam-monorepo/database/client";
import clsx from "clsx";
import type { ReactNode } from "react";
import { FaEye } from "react-icons/fa";
import { UpdateRequiredRoles } from "./UpdateRequiredRoles";

const VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  [TaskVisibility.PUBLIC]: "Öffentlich",
  [TaskVisibility.PERSONALIZED]: "Personalisiert",
  [TaskVisibility.GROUP]: "Gruppe",
};

interface Props {
  readonly className?: string;
  readonly task: Pick<
    VisibleTask,
    | "id"
    | "visibility"
    | "requiredRoles"
    | "hiddenForOtherRoles"
    | "canSelfComplete"
  >;
  /** Shows the editor of the required roles */
  readonly isEditable: boolean;
}

/** Who can see and accept the task */
export const TaskAudience = ({ className, task, isEditable }: Props) => {
  const isPublic = task.visibility === TaskVisibility.PUBLIC;

  return (
    <Tile heading="Zielgruppe" className={className}>
      <dl className="flex flex-col gap-4">
        <AudienceEntry term="Sichtbarkeit">
          <span className="flex items-center gap-2">
            <FaEye className="text-neutral-500" />
            {VISIBILITY_LABELS[task.visibility]}
          </span>
        </AudienceEntry>

        {isPublic && (
          <AudienceEntry term="Erforderliche Rolle(n)">
            <div className="flex items-center gap-2">
              {task.requiredRoles.length > 0 ? (
                <div className="flex flex-wrap gap-1">
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

              {isEditable && (
                <UpdateRequiredRoles
                  task={{
                    id: task.id,
                    requiredRoles: task.requiredRoles,
                    hiddenForOtherRoles: task.hiddenForOtherRoles,
                  }}
                  className="flex-none"
                />
              )}
            </div>
          </AudienceEntry>
        )}

        {!isPublic && (
          <AudienceEntry term="Kann selbstständig abgeschlossen werden">
            {task.canSelfComplete ? "Ja" : "Nein"}
          </AudienceEntry>
        )}
      </dl>
    </Tile>
  );
};

interface AudienceEntryProps {
  readonly className?: string;
  readonly term: string;
  readonly children: ReactNode;
}

const AudienceEntry = ({ className, term, children }: AudienceEntryProps) => {
  return (
    <div className={clsx(className)}>
      <dt className="font-mono text-xs text-neutral-500 uppercase">{term}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
};
