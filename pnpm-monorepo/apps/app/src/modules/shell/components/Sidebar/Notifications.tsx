"use client";

import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { useState } from "react";
import { FaBell } from "react-icons/fa";
import { BarItemContent } from "./BarItemContent";
import { BottomSheet } from "./BottomSheet";

export const Notifications = () => {
  const { unreadCount } = useOnSiteNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BottomSheet
      title="Benachrichtigungen"
      trigger={
        <BarItemContent
          icon={<FaBell />}
          label="Inbox"
          hasUnreadDot={unreadCount > 0}
        />
      }
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <NotificationCenter onNavigate={() => setIsOpen(false)} />
    </BottomSheet>
  );
};
