import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { type CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findTaskListPage,
  TaskAcceptedFilter,
  TaskCreatorFilter,
  toTaskListRow,
  type TaskListRow,
  type TaskListStatus,
} from "@sam-monorepo/application";
import { cache } from "react";

/** The closed tasks increase each day, thus the list shows them in pages */
const CLOSED_TASKS_PAGE_SIZE = 20;

interface TasksPage {
  readonly tasks: TaskListRow[];
  readonly newTaskIds: ReadonlySet<string>;
  readonly nextCursor: string | null;
  readonly prevCursor: string | null;
}

export const getTasks = cache(
  withTrace(
    "getTasks",
    async (
      status: TaskListStatus,
      accepted: string,
      createdBy: string,
      cursor: string | null,
      direction: CursorDirection,
    ): Promise<TasksPage> => {
      try {
        const page = await findTaskListPage(
          getApplicationContext(),
          await getRequestActor(),
          {
            status,
            accepted:
              accepted === "yes"
                ? TaskAcceptedFilter.Yes
                : TaskAcceptedFilter.All,
            created_by:
              createdBy === "me" ? TaskCreatorFilter.Me : TaskCreatorFilter.All,
            limit: CLOSED_TASKS_PAGE_SIZE,
            cursor: cursor ?? undefined,
          },
          { direction, allOpenTasksOnOnePage: true },
        );

        return {
          tasks: page.rows.map(toTaskListRow),
          newTaskIds: page.newTaskIds,
          nextCursor: page.nextCursor,
          prevCursor: page.prevCursor,
        };
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
