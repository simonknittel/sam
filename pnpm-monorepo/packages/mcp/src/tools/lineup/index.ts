import type { CatalogTool } from "../../toolDefinition.js";
import { assignEventPositionTool } from "./assignEventPosition.js";
import { createEventPositionTool } from "./createEventPosition.js";
import { deleteEventPositionTool } from "./deleteEventPosition.js";
import { getEventLineupTool } from "./getEventLineup.js";
import { reorderEventLineupTool } from "./reorderEventLineup.js";
import { updateEventPositionTool } from "./updateEventPosition.js";
import { updateMyEventPositionApplicationTool } from "./updateMyEventPositionApplication.js";

export const lineupTools: readonly CatalogTool[] = [
  getEventLineupTool,
  createEventPositionTool,
  updateEventPositionTool,
  deleteEventPositionTool,
  reorderEventLineupTool,
  assignEventPositionTool,
  updateMyEventPositionApplicationTool,
];
