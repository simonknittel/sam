"use client";

import { api } from "@/trpc/react";

/**
 * For a change of the read state outside of the notification center, for
 * example the read of an item, which marks the notifications that announced it.
 */
export const useRefetchOnSiteNotifications = () => {
  const utils = api.useUtils();

  return () => {
    void utils.onSiteNotifications.invalidate();
  };
};
