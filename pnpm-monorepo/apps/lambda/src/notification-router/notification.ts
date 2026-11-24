import { type Citizen } from "@sam-monorepo/database";
import type { ParsedOnSiteNotificationPayload } from "@sam-monorepo/domain";

export type Notification = {
  readonly receiverId: Citizen["id"];
  readonly title: string;
  readonly body: string;
  readonly url?: string;
} & ParsedOnSiteNotificationPayload;
