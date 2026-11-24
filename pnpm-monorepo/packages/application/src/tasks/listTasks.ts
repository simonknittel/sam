import type { Prisma } from "@sam-monorepo/database/client";
import {
  buildCursorConditions,
  CursorDirection,
  cursorOrderBy,
  paginateMergedSources,
  ReadMarkerSubject,
  type MergedCursorSourceInput,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  cursorSchema,
  pageLimitSchema,
  type PageOptions,
} from "../pagination.js";
import { buildUnreadWhere } from "../readMarkers/unreadWhere.js";
import { withSpan } from "../withSpan.js";
import { findNewTaskIds } from "./findNewTaskIds.js";
import {
  TASK_LIST_ITEM_SELECT,
  type TaskListItemRow,
} from "./taskListSelect.js";
import { toTaskListItem, type TaskListItem } from "./taskOutput.js";
import { getOpenTasksWhere, getVisibleTasksWhere } from "./taskWhere.js";

export enum TaskListStatus {
  Open = "open",
  /** The open tasks which are new for the viewer (see the read markers) */
  New = "new",
  /** The completed, cancelled and expired tasks */
  Closed = "closed",
}

export enum TaskAcceptedFilter {
  All = "all",
  Yes = "yes",
}

export enum TaskCreatorFilter {
  All = "all",
  Me = "me",
}

export const listTasksInputSchema = z.object({
  status: z
    .enum(TaskListStatus)
    .default(TaskListStatus.Open)
    .describe(
      "open: the open tasks, the newest first. new: the open tasks that are new for the user. closed: the completed, cancelled and expired tasks, the most recently closed first.",
    ),
  accepted: z
    .enum(TaskAcceptedFilter)
    .default(TaskAcceptedFilter.All)
    .describe("yes: only the tasks that the user accepted."),
  created_by: z
    .enum(TaskCreatorFilter)
    .default(TaskCreatorFilter.All)
    .describe("me: only the tasks that the user created."),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListTasksInput = z.output<typeof listTasksInputSchema>;

export interface ListTasksOutput {
  readonly tasks: TaskListItem[];
  readonly next_cursor: string | null;
}

export interface TaskListPageOptions extends PageOptions {
  /**
   * The task list of the app shows all open tasks on one page: they are a
   * short list. Then `limit` applies only to the closed tasks.
   */
  readonly allOpenTasksOnOnePage?: boolean;
}

export interface TaskListPage {
  readonly rows: TaskListItemRow[];
  readonly newTaskIds: ReadonlySet<string>;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

enum TaskSourceKey {
  Open = "open",
  Cancelled = "cancelled",
  Completed = "completed",
  Expired = "expired",
}

type TaskDateField = "createdAt" | "completedAt" | "cancelledAt" | "expiresAt";

interface TaskSource {
  readonly sourceKey: TaskSourceKey;
  readonly dateField: TaskDateField;
}

const OPEN_TASK_SOURCE: TaskSource = {
  sourceKey: TaskSourceKey.Open,
  dateField: "createdAt",
};

/**
 * The closed tasks, the most recently closed first: by the completion date,
 * else the cancellation date, else the expiry date. The database cannot sort
 * by the first of these dates that is set. Thus each case is a separate
 * source, and `paginateMergedSources()` merges the sources by date.
 */
const CLOSED_TASK_SOURCES: readonly (TaskSource & {
  readonly where: (now: Date) => Prisma.TaskWhereInput;
})[] = [
  {
    sourceKey: TaskSourceKey.Completed,
    dateField: "completedAt",
    where: () => ({ completedAt: { not: null } }),
  },
  {
    sourceKey: TaskSourceKey.Cancelled,
    dateField: "cancelledAt",
    where: () => ({ completedAt: null, cancelledAt: { not: null } }),
  },
  {
    sourceKey: TaskSourceKey.Expired,
    dateField: "expiresAt",
    where: (now) => ({
      completedAt: null,
      cancelledAt: null,
      expiresAt: { lt: now },
    }),
  },
];

const createTaskSource =
  (
    context: ApplicationContext,
    { sourceKey, dateField }: TaskSource,
    where: Prisma.TaskWhereInput,
  ) =>
  async ({ position, direction, take }: MergedCursorSourceInput) => {
    const tasks = await context.prisma.task.findMany({
      where: {
        AND: [
          where,
          ...buildCursorConditions(position, sourceKey, direction, dateField),
        ],
      },
      select: TASK_LIST_ITEM_SELECT,
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

interface PageRequest {
  readonly limit: number;
  readonly cursor: string | null;
  readonly direction: CursorDirection;
}

const findTaskPage = async (
  sources: ReturnType<typeof createTaskSource>[],
  { limit, cursor, direction }: PageRequest,
) => {
  const page = await paginateMergedSources({
    sources,
    pageSize: limit,
    cursor,
    direction,
  });

  return {
    rows: page.entries.map((entry) => entry.task),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
  };
};

const findOpenTaskPage = async (
  context: ApplicationContext,
  where: Prisma.TaskWhereInput,
  pageRequest: PageRequest,
  allOnOnePage: boolean,
) => {
  if (!allOnOnePage)
    return findTaskPage(
      [createTaskSource(context, OPEN_TASK_SOURCE, where)],
      pageRequest,
    );

  const rows = await context.prisma.task.findMany({
    where,
    select: TASK_LIST_ITEM_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return { rows, nextCursor: null, prevCursor: null };
};

const getFilterWhere = (
  input: Pick<ListTasksInput, "accepted" | "created_by">,
  citizenId: string,
): Prisma.TaskWhereInput => ({
  ...(input.accepted === TaskAcceptedFilter.Yes && {
    assignments: { some: { citizenId } },
  }),
  ...(input.created_by === TaskCreatorFilter.Me && {
    createdById: citizenId,
  }),
});

const EMPTY_PAGE: TaskListPage = {
  rows: [],
  newTaskIds: new Set(),
  nextCursor: null,
  prevCursor: null,
};

export const findTaskListPage = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListTasksInput,
  {
    direction = CursorDirection.Next,
    allOpenTasksOnOnePage = false,
  }: TaskListPageOptions = {},
): Promise<TaskListPage> => {
  requirePermission(actor, "task", "read");

  const now = context.now();
  const pageRequest: PageRequest = {
    limit: input.limit,
    cursor: input.cursor ?? null,
    direction,
  };

  const getBaseWhere = () => [
    getFilterWhere(input, requireCitizen(actor).id),
    getVisibleTasksWhere(actor),
  ];

  switch (input.status) {
    case TaskListStatus.Open: {
      const page = await findOpenTaskPage(
        context,
        { AND: [getOpenTasksWhere(now), ...getBaseWhere()] },
        pageRequest,
        allOpenTasksOnOnePage,
      );
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);

      return {
        ...page,
        newTaskIds: new Set(
          unreadWhere
            ? await findNewTaskIds(
                context.prisma,
                page.rows.map((row) => row.id),
                unreadWhere,
                now,
              )
            : [],
        ),
      };
    }

    case TaskListStatus.New: {
      const unreadWhere = buildUnreadWhere(actor, ReadMarkerSubject.Task);
      if (!unreadWhere) return EMPTY_PAGE;

      const page = await findOpenTaskPage(
        context,
        {
          AND: [getOpenTasksWhere(now), ...getBaseWhere(), unreadWhere],
        },
        pageRequest,
        allOpenTasksOnOnePage,
      );

      return {
        ...page,
        newTaskIds: new Set(page.rows.map((row) => row.id)),
      };
    }

    case TaskListStatus.Closed: {
      const baseWhere = getBaseWhere();
      const page = await findTaskPage(
        CLOSED_TASK_SOURCES.map((source) =>
          createTaskSource(context, source, {
            AND: [{ deletedAt: null }, ...baseWhere, source.where(now)],
          }),
        ),
        pageRequest,
      );

      // Only open tasks can be new
      return { ...page, newTaskIds: new Set() };
    }

    default:
      throw new Error(
        `Unknown task list status: ${input.status satisfies never}`,
      );
  }
};

export const listTasks = (
  context: ApplicationContext,
  actor: Actor,
  input: ListTasksInput,
): Promise<ListTasksOutput> =>
  withSpan(context, "listTasks", async () => {
    const page = await findTaskListPage(context, actor, input);
    const now = context.now();

    return {
      tasks: page.rows.map((row) =>
        toTaskListItem(row, {
          actor,
          now,
          isNew: page.newTaskIds.has(row.id),
        }),
      ),
      next_cursor: page.nextCursor,
    };
  });
