"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AccordeonLink } from "@/modules/common/components/Accordeon";
import { Badge } from "@/modules/common/components/Badge";
import { Link } from "@/modules/common/components/Link";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  type Entity,
  type TaskAssignment,
  type Task as TaskType,
} from "@prisma/client";
import clsx from "clsx";
import type { ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaCheck, FaCheckSquare, FaClock, FaInfoCircle } from "react-icons/fa";
import { IoPerson } from "react-icons/io5";
import { TbRepeatOnce } from "react-icons/tb";

interface TaskWithIncludes extends TaskType {
  assignments: (Pick<TaskAssignment, "citizenId"> & {
    citizen: Pick<Entity, "id" | "handle">;
  })[];
  completionists?: Pick<Entity, "id">[];
}

interface Props {
  readonly className?: string;
  readonly task: TaskWithIncludes;
}

export const Task = ({ className, task }: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

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
    <Link
      href={`/app/tasks/${task.id}`}
      className={clsx(
        "flex background-secondary rounded-secondary overflow-hidden hover:bg-neutral-800 beveled-br",
        className,
      )}
      style={{ "--bevel-size": 16 }}
    >
      {isTaskAssignedToCurrentCitizen && (
        <div
          title="Dieser Task ist mir zugewiesen"
          className="bg-me flex items-center p-2"
        >
          <FaCheck className="text-sm" />
        </div>
      )}

      <div className="flex-1">
        <h3 className="font-bold p-2">{task.title}</h3>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2 pb-2">{badges}</div>
        )}
      </div>

      <AccordeonLink title="Details öffnen" />
    </Link>
  );
};
