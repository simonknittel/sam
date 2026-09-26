import type { RouterOutputs } from "@/trpc/react";

export type OnSiteNotificationRow =
  RouterOutputs["onSiteNotifications"]["list"]["items"][number];

export enum NotificationCenterTab {
  Inbox = "inbox",
  Archive = "archive",
}
