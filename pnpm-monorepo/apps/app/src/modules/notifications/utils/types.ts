import type { RouterOutputs } from "@/modules/common/utils/api";

export type OnSiteNotificationRow =
  RouterOutputs["onSiteNotifications"]["list"]["items"][number];

export enum NotificationCenterTab {
  Inbox = "inbox",
  Archive = "archive",
}
