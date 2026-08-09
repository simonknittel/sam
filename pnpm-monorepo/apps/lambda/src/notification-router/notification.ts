import { type Entity } from "@sam-monorepo/database";
import { type ParsedOnSiteNotificationPayload } from "@sam-monorepo/notifications";

/**
 * A single notification for a single recipient. The `notificationType` +
 * `payload` pair is typed against the shared schemas so every notification
 * going through the publisher can be persisted as an on-site notification.
 */
export type Notification = {
  readonly receiverId: Entity["id"];
  readonly title: string;
  readonly body: string;
  readonly url?: string;
} & ParsedOnSiteNotificationPayload;
