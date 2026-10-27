import type { CatalogTool } from "../../toolDefinition.js";
import { createEventTool } from "./createEvent.js";
import { deleteEventTool } from "./deleteEvent.js";
import { getEventTool } from "./getEvent.js";
import { listEventsTool } from "./listEvents.js";
import { updateEventTool } from "./updateEvent.js";
import { updateEventManagersTool } from "./updateEventManagers.js";
import { updateEventParticipantsTool } from "./updateEventParticipants.js";
import { updateMyEventParticipationTool } from "./updateMyEventParticipation.js";

export const eventsTools: readonly CatalogTool[] = [
  createEventTool,
  deleteEventTool,
  getEventTool,
  listEventsTool,
  updateEventTool,
  updateEventManagersTool,
  updateEventParticipantsTool,
  updateMyEventParticipationTool,
];
