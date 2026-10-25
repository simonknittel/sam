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
  markItemsAsReadInputSchema,
  markItemsAsRead as markItemsAsReadUseCase,
  type MarkItemsAsReadOutput,
} from "@sam-monorepo/application";

export interface MarkItemsAsReadResponse extends ActionSuccess {
  /**
   * Whether one of the items was new for the viewer. The client then
   * refreshes the page, see `<UnseenEntriesProvider>`.
   */
  readonly newItemsRead: boolean;
}

/**
 * Marks a batch of items of one subject type as read by the viewer. The
 * read-on-view tracking of the changelog page calls it, hence the batch
 * input. Repeated calls change nothing.
 *
 * Without a `refresh()`: the tracking runs while the viewer reads, and the
 * refresh of the old page can win the race against a click on a link and
 * keep the old page open. The client refreshes the router instead.
 */
export const markItemsAsRead = createAuthenticatedAction<
  typeof markItemsAsReadInputSchema,
  MarkItemsAsReadResponse
>(
  "markItemsAsRead",
  markItemsAsReadInputSchema,
  async (formData, authentication, data, t) => {
    let result: MarkItemsAsReadOutput;
    try {
      result = await markItemsAsReadUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        data,
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, { formData, t });
    }

    return {
      success: "Als gelesen markiert",
      newItemsRead: result.new_count > 0,
    };
  },
  {
    parseFormData: (formData) => ({
      subject: formData.get("subject"),
      subject_ids: formData.getAll("subjectId"),
    }),
  },
);
