import {
  CalendarEntryType,
  getLocalDate,
  ORGANIZATION_TIMEZONE,
} from "@sam-monorepo/domain";
import { requireCitizen } from "../actor.js";
import { getTaskStatus } from "../tasks/taskRules.js";
import type {
  CalendarEntryCollector,
  TaskDeadlineCalendarEntry,
} from "./calendarEntry.js";

/**
 * The expiry of the tasks that the citizen of the actor accepted or was
 * assigned to: both give a task assignment. The visibility of the tasks is
 * not checked, because an assignee always sees the task (see
 * `getVisibleTasksWhere`). Deleted and cancelled tasks are left out. The task
 * features need a citizen.
 */
export const taskDeadlineEntryCollector: CalendarEntryCollector<TaskDeadlineCalendarEntry> =
  {
    canRead: (actor) =>
      actor.citizen !== null && actor.authorize("task", "read"),
    collect: async (context, actor, { from, until }) => {
      const citizen = requireCitizen(actor);

      const tasks = await context.prisma.task.findMany({
        where: {
          assignments: { some: { citizenId: citizen.id } },
          deletedAt: null,
          cancelledAt: null,
          expiresAt: { gte: from, lt: until },
        },
        select: {
          id: true,
          title: true,
          expiresAt: true,
          completedAt: true,
          cancelledAt: true,
        },
      });

      const now = context.now();

      return tasks.flatMap(({ expiresAt, ...task }) => {
        if (!expiresAt) return [];

        return [
          {
            type: CalendarEntryType.TaskDeadline,
            key: `task_deadline:${task.id}`,
            date: getLocalDate(expiresAt, ORGANIZATION_TIMEZONE),
            time: expiresAt,
            href: `/app/tasks/${task.id}`,
            task: { id: task.id, title: task.title },
            status: getTaskStatus({ ...task, expiresAt }, now),
          },
        ];
      });
    },
  };
