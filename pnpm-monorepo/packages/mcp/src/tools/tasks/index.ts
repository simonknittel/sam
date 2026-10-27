import type { CatalogTool } from "../../toolDefinition.js";
import { cancelTaskTool } from "./cancelTask.js";
import { completeTaskTool } from "./completeTask.js";
import { createTaskTool } from "./createTask.js";
import { getTaskTool } from "./getTask.js";
import { listTasksTool } from "./listTasks.js";
import { updateMyTaskAssignmentTool } from "./updateMyTaskAssignment.js";
import { updateTaskTool } from "./updateTask.js";

export const tasksTools: readonly CatalogTool[] = [
  cancelTaskTool,
  completeTaskTool,
  createTaskTool,
  getTaskTool,
  listTasksTool,
  updateMyTaskAssignmentTool,
  updateTaskTool,
];
