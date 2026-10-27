import {
  acceptTask,
  acceptTaskInputSchema,
  dropTask,
} from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import {
  isTaskWriteToolVisible,
  taskOutputSchema,
} from "./taskOutputSchemas.js";

export enum MyTaskAssignmentAction {
  Accept = "accept",
  Drop = "drop",
}

export const updateMyTaskAssignmentTool = defineTool({
  name: "update_my_task_assignment",
  group: ToolGroup.Tasks,
  title: "Accept or drop a task",
  description:
    "Assigns the user to an open public task (task_id from list_tasks or get_task), or removes the assignment of the user from it. accept needs a free place of the task and one of its required roles; a repeated accept changes nothing. drop needs an assignment of the user. Gives the task in the format of get_task, or null when the user cannot see the task after drop (a task that is hidden for other roles, when the user lost the required role).",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  // The two use cases have the same input
  inputSchema: acceptTaskInputSchema.extend({
    action: z.enum(MyTaskAssignmentAction),
  }),
  outputSchema: z.strictObject({
    task: taskOutputSchema.nullable(),
  }),
  isVisible: isTaskWriteToolVisible,
  handler: async (context, actor, { action, ...input }) => {
    switch (action) {
      case MyTaskAssignmentAction.Accept:
        return { task: await acceptTask(context, actor, input) };

      case MyTaskAssignmentAction.Drop:
        return dropTask(context, actor, input);

      default:
        throw new Error(
          `Unknown task assignment action: ${action satisfies never}`,
        );
    }
  },
});
