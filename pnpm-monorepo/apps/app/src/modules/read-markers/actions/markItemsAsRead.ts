"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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
import { refresh } from "next/cache";
import type { MarkAsReadResponse } from "../utils/markAsReadResponse";

/**
 * Marks a batch of items of one subject type as read by the viewer. The
 * read-on-view tracking of the changelog page calls it, hence the batch
 * input. Repeated calls change nothing.
 */
export const markItemsAsRead = createAuthenticatedAction<
  typeof markItemsAsReadInputSchema,
  MarkAsReadResponse
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

    // The "new" state shows in lists, tiles and the dot badges of the app layout
    if (result.new_count > 0) refresh();

    return {
      success: "Als gelesen markiert",
      notificationsRead: result.notifications_read > 0,
    };
  },
  {
    parseFormData: (formData) => ({
      subject: formData.get("subject"),
      subject_ids: formData.getAll("subjectId"),
    }),
  },
);
