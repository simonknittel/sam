"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AccordeonLink } from "@/modules/common/components/Accordeon";
import { Badge } from "@/modules/common/components/Badge";
import { Link } from "@/modules/common/components/Link";
import { UnreadEdge } from "@/modules/common/components/UnreadEdge";
import { formatDate } from "@/modules/common/utils/formatDate";
import { NewMarkerButton } from "@/modules/read-markers/components/NewMarkerButton";
import { useMarkAsRead } from "@/modules/read-markers/hooks/useMarkAsRead";
import type { TaskListRow } from "@/modules/tasks/queries/taskListSelect";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import clsx from "clsx";
import type { ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheck, FaCheckSquare, FaClock, FaInfoCircle } from "react-icons/fa";
import { IoPerson } from "react-icons/io5";
import { TbRepeatOnce } from "react-icons/tb";

interface Props {
  readonly className?: string;
  readonly task: TaskListRow;
  readonly isNew: boolean;
}

export const Task = ({ className, task, isNew: isNewOnServer }: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const { isNew, markAsRead } = useMarkAsRead(
    ReadMarkerSubject.Task,
    task.id,
    isNewOnServer,
  );

  const badges: ReactNode[] = [];
  if (task.expiresAt) {
    badges.push(
      <Badge
        key="expiresAt"
        label="Ablaufdatum"
        value={formatDate(task.expiresAt)!}
        icon={<FaClock />}
        className="text-sm"
      />,
    );
  }
  if (task.repeatable && task.repeatable > 1) {
    badges.push(
      <Badge
        key="repeatable"
        label="Wiederholbar"
        value={`${task.repeatable}x`}
        icon={<TbRepeatOnce />}
      />,
    );
  }
  if (task.completionists && task.completionists.length > 0) {
    badges.push(
      <Badge
        key="status"
        label="Status"
        value="Erfüllt"
        icon={<FaCheckSquare />}
        className="text-sm text-green-500"
      />,
    );
  } else if (task.cancelledAt) {
    badges.push(
      <Badge
        key="status"
        label="Status"
        value="Abgebrochen"
        icon={<FaInfoCircle />}
        className="text-sm text-blue-500"
      />,
    );
  } else if (task.deletedAt) {
    badges.push(
      <Badge
        key="deleted"
        label="Gelöscht"
        value="Gelöscht"
        icon={<FaInfoCircle />}
        className="text-sm text-blue-500"
      />,
    );
  } else if (
    task.expiresAt &&
    task.expiresAt < new Date() &&
    task.completionists &&
    task.completionists.length <= 0
  ) {
    badges.push(
      <Badge
        key="status"
        label="Status"
        value="Abgelaufen"
        icon={<BsExclamationOctagonFill />}
        className="text-sm text-red-500"
      />,
    );
  }
  if (task.assignments.length > 0) {
    badges.push(
      <Badge
        key="assignments"
        label="Angenommen von"
        value={`${task.assignments[0].citizen.handle || task.assignments[0].citizen.id}${
          task.assignments.length > 1
            ? ` + ${task.assignments.length - 1} weitere`
            : ""
        }`}
        icon={<IoPerson />}
        className="text-sm"
      />,
    );
  }

  const isTaskAssignedToCurrentCitizen = task.assignments.some(
    (assignment) => assignment.citizenId === authentication.session.entity?.id,
  );

  return (
    <article
      className={clsx(
        "relative flex bg-secondary overflow-hidden hover:bg-neutral-800 focus-within:bg-neutral-800 active:bg-neutral-700 corners-secondary has-[a:focus-visible]:outline-2 outline-offset-2 outline-interaction-700",
        className,
      )}
    >
      {isNew && <UnreadEdge />}

      {isTaskAssignedToCurrentCitizen && (
        /* A second link above the covering link keeps the tooltip of the
        strip. It has the same target as the title link, thus the keyboard and
        assistive technology skip it. */
        <Link
          href={`/app/tasks/${task.id}`}
          tabIndex={-1}
          aria-hidden="true"
          title="Dieser Task ist mir zugewiesen"
          className="relative bg-me flex items-center p-2"
        >
          <FaCheck className="text-sm" />
        </Link>
      )}

      <div className="flex-1">
        <div className="flex items-baseline gap-2 p-2">
          <h3 className="font-bold">
            {/* The link covers the whole row, thus the row opens the details
            like before. The marker button sits above it. */}
            <Link
              href={`/app/tasks/${task.id}`}
              title="Details öffnen"
              className="outline-hidden after:absolute after:inset-0"
            >
              {task.title}
            </Link>
          </h3>

          {isNew && (
            <NewMarkerButton onClick={markAsRead} className="relative" />
          )}
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2 pb-2">{badges}</div>
        )}
      </div>

      <AccordeonLink />
    </article>
  );
};
