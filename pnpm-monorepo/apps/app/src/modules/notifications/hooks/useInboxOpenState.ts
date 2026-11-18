"use client";

import { useIsHydrated } from "@/modules/common/utils/useIsHydrated";
import { useEffect, useState } from "react";
import { useOnSiteNotifications } from "../components/OnSiteNotificationsProvider";

/**
 * The open state of one inbox surface. While a request of the provider is
 * pending and the surface can act, the inbox opens and the request settles.
 * An inbox which is open already stays open. After the user closes the
 * inbox, it stays closed until the next request.
 *
 * Only one surface at a time can act, otherwise two inboxes open.
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
