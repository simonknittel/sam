import type { CatalogTool } from "../../toolDefinition.js";
import { sendManualNotificationTool } from "./sendManualNotification.js";

export const manualNotificationTools: readonly CatalogTool[] = [
  sendManualNotificationTool,
];
