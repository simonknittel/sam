import { cancelTask, cancelTaskInputSchema } from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isTaskWriteToolVisible,
  taskOutputSchema,
} from "./taskOutputSchemas.js";

export const cancelTaskTool = defineTool({
  name: "cancel_task",
  group: ToolGroup.Tasks,
  title: "Cancel a task",
  description:
    "Cancels an open task (task_id from list_tasks or get_task): nobody can accept or complete it after this. Only the creator of the task and a task manager can cancel it. The assignees are notified. Gives the cancelled task in the format of get_task.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: cancelTaskInputSchema,
  outputSchema: taskOutputSchema,
  isVisible: isTaskWriteToolVisible,
  handler: cancelTask,
});
