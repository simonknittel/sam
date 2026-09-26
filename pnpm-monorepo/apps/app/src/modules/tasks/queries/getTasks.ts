import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { type CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  buildCursorConditions,
  cursorOrderBy,
  paginateMergedSources,
  type MergedCursorSourceInput,
} from "@/modules/common/CursorPagination/mergedCursor";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Prisma } from "@sam-monorepo/database/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getVisibleTasksWhere } from "./getVisibleTasksWhere";
import { TASK_LIST_SELECT, type TaskListRow } from "./taskListSelect";

/** The closed tasks increase each day, thus the list shows them in pages */
const CLOSED_TASKS_PAGE_SIZE = 20;

enum ClosedTaskSourceKey {
  Cancelled = "cancelled",
  Completed = "completed",
  Expired = "expired",
}

type ClosedDateField = "completedAt" | "cancelledAt" | "expiresAt";

/**
 * The closed tasks, the most recently closed first: by the completion date,
 * else the cancellation date, else the expiry date. The database cannot sort
 * by the first of these dates that is set. Thus each case is a separate
 * source, and `paginateMergedSources()` merges the sources by date.
 */
interface ClosedTaskSource {
  readonly sourceKey: ClosedTaskSourceKey;
  readonly dateField: ClosedDateField;
  readonly where: (now: Date) => Prisma.TaskWhereInput;
}

const CLOSED_TASK_SOURCES: readonly ClosedTaskSource[] = [
  {
    sourceKey: ClosedTaskSourceKey.Completed,
    dateField: "completedAt",
    where: () => ({ completedAt: { not: null } }),
  },
  {
    sourceKey: ClosedTaskSourceKey.Cancelled,
    dateField: "cancelledAt",
    where: () => ({ completedAt: null, cancelledAt: { not: null } }),
  },
  {
    sourceKey: ClosedTaskSourceKey.Expired,
    dateField: "expiresAt",
    where: (now) => ({
      completedAt: null,
      cancelledAt: null,
      expiresAt: { lt: now },
    }),
  },
];

const createClosedTaskSource =
  ({ sourceKey, dateField }: ClosedTaskSource, where: Prisma.TaskWhereInput) =>
  async ({ position, direction, take }: MergedCursorSourceInput) => {
    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          where,
          ...buildCursorConditions(position, sourceKey, direction, dateField),
        ],
      },
      select: TASK_LIST_SELECT,
      orderBy: cursorOrderBy(direction, dateField),
      take,
    });

    return tasks.map((task) => ({
      sourceKey,
      id: task.id,
      // The where of the source makes sure that the date is set
      date: task[dateField]!,
      task,
    }));
  };

const getFilterWhere = (
  accepted: string,
  createdBy: string,
  citizenId: string | undefined,
): Prisma.TaskWhereInput => ({
  ...(accepted === "yes" && {
    assignments: {
      some: {
        citizenId,
      },
    },
  }),
  ...(createdBy === "me" && {
    createdById: citizenId,
  }),
});

const getOpenTasks = async (filterWhere: Prisma.TaskWhereInput) => {
  return prisma.task.findMany({
    where: {
      AND: [
        {
          cancelledAt: null,
          deletedAt: null,
          completedAt: null,
          OR: [
            {
              expiresAt: {
                gte: new Date(),
              },
            },
            {
              expiresAt: null,
            },
          ],
        },
        filterWhere,
        await getVisibleTasksWhere(),
      ],
    },
    select: TASK_LIST_SELECT,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getClosedTasks = async (
  filterWhere: Prisma.TaskWhereInput,
  cursor: string | null,
  direction: CursorDirection,
) => {
  const now = new Date();
  const visibleTasksWhere = await getVisibleTasksWhere();

  const page = await paginateMergedSources({
    sources: CLOSED_TASK_SOURCES.map((source) =>
      createClosedTaskSource(source, {
        AND: [
          { deletedAt: null },
          filterWhere,
          visibleTasksWhere,
          source.where(now),
        ],
      }),
    ),
    pageSize: CLOSED_TASKS_PAGE_SIZE,
    cursor,
    direction,
  });

  return {
    tasks: page.entries.map((entry) => entry.task),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
  };
};

interface TasksPage {
  readonly tasks: TaskListRow[];
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

export const getTasks = cache(
  withTrace(
    "getTasks",
    async (
      status: string,
      accepted: string,
      createdBy: string,
      cursor: string | null,
      direction: CursorDirection,
    ): Promise<TasksPage> => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("task", "read"))) forbidden();

      const filterWhere = getFilterWhere(
        accepted,
        createdBy,
        authentication.session.entity?.id,
      );

      if (status === "closed")
        return getClosedTasks(filterWhere, cursor, direction);

      /**
       * Only the tasks which are open now, thus a small list without
       * pages
       */
      return {
        tasks: await getOpenTasks(filterWhere),
        nextCursor: null,
        prevCursor: null,
      };
    },
  ),
);
