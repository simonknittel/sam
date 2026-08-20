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
    >
      <PopoverChildren />
    </PopoverBaseUI>
  );
};

const PopoverChildren = () => {
  const { closePopover } = usePopoverBaseUI();

  return <NotificationCenter onNavigate={closePopover} />;
};
