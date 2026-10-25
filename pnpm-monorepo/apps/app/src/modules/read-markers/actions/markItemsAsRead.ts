"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import {
  markItemsAsReadInputSchema,
  markItemsAsRead as markItemsAsReadUseCase,
} from "@sam-monorepo/application";

/**
 * Marks a batch of items of one subject type as read by the viewer. The
 * read-on-view tracking of the changelog page calls it, hence the batch
 * input. Repeated calls change nothing.
 */
export const markItemsAsRead = createUseCaseAction({
  name: "markItemsAsRead",
  schema: markItemsAsReadInputSchema,
  useCase: markItemsAsReadUseCase,
  parseFormData: (formData) => ({
    subject: formData.get("subject"),
    subject_ids: formData.getAll("subjectId"),
  }),
  /**
   * The tracking runs while the viewer reads, and the refresh of the old page
   * can win the race against a click on a link and keep the old page open.
   * The client refreshes the router instead (see `<UnseenEntriesProvider>`),
   * when one of the items was new.
   */
  refresh: ActionRefresh.Never,
  success: () => "Als gelesen markiert",
  responseFields: (output) => ({ newItemsRead: output.new_count > 0 }),
});
