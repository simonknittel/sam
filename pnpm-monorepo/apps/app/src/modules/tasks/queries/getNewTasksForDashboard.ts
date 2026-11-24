import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findNewTaskRows } from "@sam-monorepo/application";
import { cache } from "react";

/** Keeps the tile short; the tasks list shows all new tasks */
const MAXIMUM_NEW_TASKS = 5;

export const getNewTasksForDashboard = cache(
  withTrace("getNewTasksForDashboard", async () => {
    try {
      return await findNewTaskRows(
        getApplicationContext(),
        await getRequestActor(),
        { limit: MAXIMUM_NEW_TASKS },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
