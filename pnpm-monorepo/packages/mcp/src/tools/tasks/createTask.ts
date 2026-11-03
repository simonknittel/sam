import { createTask, createTaskInputSchema } from "@sam-monorepo/application";
import * as z from "zod";
import { defineTool } from "../../toolDefinition.js";
import { ToolGroup } from "../../toolGroup.js";
import { taskOutputSchema } from "./taskOutputSchemas.js";

export const createTaskTool = defineTool({
  name: "create_task",
  group: ToolGroup.Tasks,
  title: "Create a task",
  description:
    "Creates a task with a title, a reward and a visibility. A public task can require roles (role ids from list_roles); a group or a personalized task goes to the citizens of assignee_ids (citizen ids from a Spynet tool), and a personalized task becomes one task for each of them. The other members are notified like in the SAM web app. Gives the new task in the format of get_task (for a personalized task the first one) and the ids of all new tasks.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: createTaskInputSchema,
  outputSchema: z.strictObject({
    task: taskOutputSchema,
    task_ids: z
      .array(z.string())
      .describe(
        "The ids of all new tasks: one for each assignee of a personalized task.",
      ),
  }),
  isVisible: (actor) =>
    actor.authorize("task", "create") && actor.citizen !== null,
  handler: createTask,
});
