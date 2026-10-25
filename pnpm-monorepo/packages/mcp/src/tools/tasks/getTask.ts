import { getTask, getTaskInputSchema } from "@sam-monorepo/application";
import { AuditEventType } from "@sam-monorepo/domain";
import {
  defineTool,
  READ_ONLY_TOOL_ANNOTATIONS,
} from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { taskOutputSchema } from "./taskOutputSchemas.js";

export const getTaskTool = defineTool({
  name: "get_task",
  group: ToolGroup.Tasks,
  title: "Get a task",
  description:
    "Gives one task with its details: the fields of list_tasks, the completionists, the required roles that the user can see, whether the user has a required role, whether the user can manage the task, whether the task is still open for changes, the repetitions and the assignment limit.",
  annotations: READ_ONLY_TOOL_ANNOTATIONS,
  readAuditEventType: AuditEventType.TASK_READ,
  inputSchema: getTaskInputSchema,
  outputSchema: taskOutputSchema,
  isVisible: (actor) =>
    actor.authorize("task", "read") && actor.citizen !== null,
  handler: getTask,
});
