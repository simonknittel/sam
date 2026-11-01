"use client";

import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { useInboxOpenState } from "@/modules/notifications/hooks/useInboxOpenState";
import { useIsLargeViewport } from "@/modules/onboarding/hooks/useIsLargeViewport";
import { FaBell } from "react-icons/fa";

export const Notifications = () => {
  const { unreadCount } = useOnSiteNotifications();
  /**
   * The top bar, and thus the trigger, shows only on a large viewport. The
   * bottom sheet of the mobile action bar never opens by itself.
   */
  const isLargeViewport = useIsLargeViewport();
  const { isOpen, setIsOpen } = useInboxOpenState(isLargeViewport);

  return (
    <PopoverBaseUI
      title="Benachrichtigungen"
      trigger={
        <>
          <FaBell />
          {unreadCount > 0 && <UnreadDot className="ml-1" />}
        </>
      }
      triggerClassName="h-full px-4 flex items-center text-neutral-500 hover:bg-tertiary hover:text-white focus-visible:bg-tertiary focus-visible:text-white cursor-pointer"
      triggerTitle="Benachrichtigungen"
      childrenClassName="w-96"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();

  return <NotificationCenter onNavigate={closePopover} />;
};
