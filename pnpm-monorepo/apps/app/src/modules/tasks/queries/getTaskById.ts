import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findVisibleTask,
  NotFoundError,
  type VisibleTask,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * The task with the relations of the task page, or null when the viewer
 * cannot see it. The deletion of a task uses the same row.
 */
export const getTaskById = cache(
  withTrace("getTaskById", async (id: VisibleTask["id"]) => {
    try {
      return await findVisibleTask(
        getApplicationContext(),
        await getRequestActor(),
        id,
      );
    } catch (error) {
      if (error instanceof NotFoundError) return null;

      return throwApplicationErrorForPage(error);
    }
  }),
);
