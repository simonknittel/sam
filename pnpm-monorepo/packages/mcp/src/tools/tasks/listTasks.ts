import { listTasks, listTasksInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { taskListItemOutputShape } from "./taskOutputSchemas.js";

export const listTasksTool = defineTool({
  name: "list_tasks",
  group: ToolGroup.Tasks,
  title: "List tasks",
  description:
    "Gives the tasks that the user can see: the open tasks (default), the open tasks that are new for the user, or the closed tasks (completed, cancelled, expired). Filters: the tasks that the user accepted, the tasks that the user created. Give a task id to get_task for the details.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.TASKS_LISTED,
  inputSchema: listTasksInputSchema,
  outputSchema: z.strictObject({
    tasks: z.array(z.strictObject(taskListItemOutputShape)),
    next_cursor: z.string().nullable(),
  }),
  isVisible: (actor) =>
    actor.authorize("task", "read") && actor.citizen !== null,
  handler: listTasks,
});
