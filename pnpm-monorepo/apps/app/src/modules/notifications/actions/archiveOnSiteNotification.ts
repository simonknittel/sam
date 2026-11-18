"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  archiveOnSiteNotificationInputSchema,
  archiveOnSiteNotification as archiveOnSiteNotificationUseCase,
} from "@sam-monorepo/application";

export const archiveOnSiteNotification = createUseCaseAction({
  name: "archiveOnSiteNotification",
  schema: archiveOnSiteNotificationInputSchema,
  useCase: archiveOnSiteNotificationUseCase,
  parseFormData: (formData) => ({
    notification_id: formData.get("notificationId"),
  }),
  /**
   * The client refreshes the router when the notification announced a new
   * item (see `useOnSiteNotificationMutations()`)
   */
  refresh: ActionRefresh.Never,
  success: () => "Archiviert",
  responseFields: (output) => ({ newItemRead: output.new_item_read }),
});
