import type { CatalogTool } from "../../toolDefinition.js";
import { listManualNotificationsTool } from "./listManualNotifications.js";
import { sendManualNotificationTool } from "./sendManualNotification.js";

export const manualNotificationTools: readonly CatalogTool[] = [
  listManualNotificationsTool,
  sendManualNotificationTool,
];
