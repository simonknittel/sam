import {
  completeTask,
  completeTaskInputSchema,
} from "@sam-monorepo/application";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isTaskWriteToolVisible,
  notifyingTaskWriteOutputSchema,
} from "./taskOutputSchemas.js";

export const completeTaskTool = defineTool({
  name: "complete_task",
  group: ToolGroup.Tasks,
  title: "Complete a task",
  description:
    "Completes an open task (task_id from list_tasks or get_task) and gives the reward to each citizen of completionist_ids: a silc reward is paid by the creator of the task, a new_silc reward is new SILC. A repeatable task gets its next repetition. Only the creator of the task and a task manager can complete it; an assignee can complete a task for its assignees when the task permits it. The receivers of SILC and the creator of the task are notified. Gives the completed task in the format of get_task.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: completeTaskInputSchema,
  outputSchema: notifyingTaskWriteOutputSchema,
  isVisible: isTaskWriteToolVisible,
  handler: completeTask,
});
