import type { CatalogTool } from "../../toolDefinition.js";
import { listMyNotificationsTool } from "./listMyNotifications.js";
import { updateNotificationTool } from "./updateNotification.js";

export const notificationTools: readonly CatalogTool[] = [
  listMyNotificationsTool,
  updateNotificationTool,
];
