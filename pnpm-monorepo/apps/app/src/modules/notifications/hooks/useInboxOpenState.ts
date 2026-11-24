"use client";

import { useIsHydrated } from "@/modules/common/utils/useIsHydrated";
import { useEffect, useState } from "react";
import { useOnSiteNotifications } from "../components/OnSiteNotificationsProvider";

/**
 * Only one surface at a time can act on the request, otherwise two inboxes
 * open.
 */
export const useInboxOpenState = (canActOnRequest: boolean) => {
  const { isInboxOpenRequested, settleInboxOpenRequest } =
    useOnSiteNotifications();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * The request of the page load is pending already during the hydration.
   * The server renders the inbox closed, thus it opens after the hydration.
   */
  const isHydrated = useIsHydrated();

  const isActingOnRequest =
    isInboxOpenRequested && canActOnRequest && isHydrated;
  if (isActingOnRequest && !isOpen) setIsOpen(true);

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The request comes from the provider, and a render must not change the state of the provider.
    if (isActingOnRequest) settleInboxOpenRequest();
  }, [isActingOnRequest, settleInboxOpenRequest]);

  return { isOpen, setIsOpen };
};
