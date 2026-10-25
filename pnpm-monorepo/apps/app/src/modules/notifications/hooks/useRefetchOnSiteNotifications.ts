"use client";

import { api } from "@/trpc/react";

/**
 * Fetches the unread count of the bell and the notification lists again. For
 * a change of the read state outside the notification center, for example
 * the read of an item, which marks the notifications that announced it.
 */
export const useRefetchOnSiteNotifications = () => {
  const utils = api.useUtils();

  return () => {
    void utils.onSiteNotifications.invalidate();
  };
};
