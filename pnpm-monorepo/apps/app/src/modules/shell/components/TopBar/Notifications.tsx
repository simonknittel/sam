"use client";

import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { FaBell } from "react-icons/fa";

export const Notifications = () => {
  const { unreadCount } = useOnSiteNotifications();

  return (
    <PopoverBaseUI
      trigger={
        <>
          <FaBell />
          {unreadCount > 0 && <UnreadDot className="ml-1" />}
        </>
      }
      triggerClassName="h-full px-4 flex items-center hover:bg-tertiary focus-visible:bg-tertiary cursor-pointer"
      triggerTitle="Benachrichtigungen"
      childrenClassName="w-96"
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();

  return <NotificationCenter onNavigate={closePopover} />;
};
