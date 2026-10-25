"use server";

import {
  createAuthenticatedAction,
  type ActionSuccess,
} from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  markItemAsReadInputSchema,
  markItemAsRead as markItemAsReadUseCase,
  type MarkItemAsReadOutput,
} from "@sam-monorepo/application";
import { refresh } from "next/cache";

export interface MarkAsReadResponse extends ActionSuccess {
  /**
   * Whether the read marked notifications as read which announced the item.
   * The client then fetches the unread count of the bell again, see
   * `useRefetchOnSiteNotifications()`.
   */
  readonly notificationsRead: boolean;
}

/**
 * Marks one item as read by the viewer: from its details once they mounted
 * in the browser (see `<MarkAsReadOnMount>`), or from a click on its "Neu"
 * marker. Repeated calls change nothing.
 */
export const markAsRead = createAuthenticatedAction<
  typeof markItemAsReadInputSchema,
  MarkAsReadResponse
>(
  "markAsRead",
  markItemAsReadInputSchema,
  async (formData, authentication, data, t) => {
    let result: MarkItemAsReadOutput;
    try {
      result = await markItemAsReadUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    /**
     * The "new" state shows in lists, tiles and the dot badges of the app
     * layout. Only a change of that state is worth the render. `was_new`
     * comes from before the write: a marker that a different tab wrote
     * between the read and the write does not stop the render, but a marker
     * that it wrote before the read does.
     */
    if (result.was_new) refresh();

    return {
      success: "Als gelesen markiert",
      notificationsRead: result.notifications_read > 0,
    };
  },
  {
    parseFormData: (formData) => ({
      subject: formData.get("subject"),
      subject_id: formData.get("subjectId"),
    }),
  },
);
