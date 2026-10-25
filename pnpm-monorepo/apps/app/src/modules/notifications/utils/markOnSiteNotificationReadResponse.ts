import type { ActionSuccess } from "@/modules/actions/utils/createAction";

export interface MarkOnSiteNotificationReadResponse extends ActionSuccess {
  /**
   * Whether the notification announced an item which was new for the
   * viewer. The client then refreshes the page, see
   * `useOnSiteNotificationMutations()`.
   */
  readonly newItemRead: boolean;
}
