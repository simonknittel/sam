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
  markOnSiteNotificationReadInputSchema,
  markOnSiteNotificationRead as markOnSiteNotificationReadUseCase,
  type MarkOnSiteNotificationReadOutput,
} from "@sam-monorepo/application";

export interface MarkOnSiteNotificationReadResponse extends ActionSuccess {
  /**
   * Whether the notification announced an item which was new for the
   * viewer. The client then refreshes the page, see
   * `useOnSiteNotificationMutations()`.
   */
  readonly newItemRead: boolean;
}

/**
 * Marks an own notification as read: from its toggle, or from a click on its
 * target. The notification center mirrors the read state into its cache.
 *
 * Without a `refresh()`: the click on a notification navigates at the same
 * time, and the refresh of the old page can win the race and keep the old
 * page open. The client refreshes the router instead, after the navigation.
 */
export const markOnSiteNotificationRead = createAuthenticatedAction<
  typeof markOnSiteNotificationReadInputSchema,
  MarkOnSiteNotificationReadResponse
>(
  "markOnSiteNotificationRead",
  markOnSiteNotificationReadInputSchema,
  async (formData, authentication, data, t) => {
    let result: MarkOnSiteNotificationReadOutput;
    try {
      result = await markOnSiteNotificationReadUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    return {
      success: "Als gelesen markiert",
      newItemRead: result.new_item_read,
    };
  },
  {
    parseFormData: (formData) => ({
      notification_id: formData.get("notificationId"),
    }),
  },
);
