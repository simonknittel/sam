"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  markOnSiteNotificationReadInputSchema,
  markOnSiteNotificationRead as markOnSiteNotificationReadUseCase,
} from "@sam-monorepo/application";

/**
 * Marks an own notification as read: from its toggle, or from a click on its
 * target. The notification center mirrors the read state into its cache.
 */
export const markOnSiteNotificationRead = createUseCaseAction({
  name: "markOnSiteNotificationRead",
  schema: markOnSiteNotificationReadInputSchema,
  useCase: markOnSiteNotificationReadUseCase,
  parseFormData: (formData) => ({
    notification_id: formData.get("notificationId"),
  }),
  /**
   * The click on a notification navigates at the same time, and the refresh
   * of the old page can win the race and keep the old page open. The client
   * refreshes the router instead (see `useOnSiteNotificationMutations()`),
   * when the notification announced a new item.
   */
  refresh: ActionRefresh.Never,
  success: () => "Als gelesen markiert",
  responseFields: (output) => ({ newItemRead: output.new_item_read }),
});
