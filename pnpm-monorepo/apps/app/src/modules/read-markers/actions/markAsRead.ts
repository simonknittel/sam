"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  markItemAsReadInputSchema,
  markItemAsRead as markItemAsReadUseCase,
} from "@sam-monorepo/application";

/**
 * Marks one item as read by the viewer: from its details once they mounted
 * in the browser (see `<MarkAsReadOnMount>`), or from a click on its "Neu"
 * marker. Repeated calls change nothing.
 */
export const markAsRead = createUseCaseAction({
  name: "markAsRead",
  schema: markItemAsReadInputSchema,
  useCase: markItemAsReadUseCase,
  parseFormData: (formData) => ({
    subject: formData.get("subject"),
    subject_id: formData.get("subjectId"),
  }),
  /**
   * The "new" state shows in lists, tiles and the dot badges of the app
   * layout. Only a change of that state is worth the render. `was_new` comes
   * from before the write: a marker that a different tab wrote between the
   * read and the write does not stop the render, but a marker that it wrote
   * before the read does.
   */
  refresh: (output) => output.was_new,
  success: () => "Als gelesen markiert",
  /**
   * The read also marked the notifications which announced the item. The
   * client then fetches the unread count of the bell again, see
   * `useRefetchOnSiteNotifications()`.
   */
  responseFields: (output) => ({
    notificationsRead: output.notifications_read > 0,
  }),
});
