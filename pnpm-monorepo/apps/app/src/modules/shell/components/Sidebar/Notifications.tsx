"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { useMobileActionBarFlyoutVisibility } from "./MobileActionBarFlyout";

export const Notifications = () => {
  const { unreadCount } = useOnSiteNotifications();

  return (
    <PopoverBaseUI
      title="Benachrichtigungen"
      trigger={
        <>
          <FaBell />
          {unreadCount > 0 && <UnreadDot className="ml-1" />}
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerTitle="Benachrichtigungen"
      childrenClassName="w-96 max-w-[calc(100dvw-1rem)]"
      positionerClassName="z-60"
      side="bottom"
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();
  const isFlyoutVisible = useMobileActionBarFlyoutVisibility();

  /**
   * The flyout can close underneath the open popover (e.g. through browser
   * back navigation) — close the popover along with it.
   */
  useEffect(() => {
    if (!isFlyoutVisible) closePopover();
  }, [isFlyoutVisible, closePopover]);

  return <NotificationCenter onNavigate={closePopover} />;
};
