"use client";

import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import { Drawer } from "@base-ui/react/drawer";
import clsx from "clsx";
import { useState } from "react";
import { FaBell } from "react-icons/fa";
import { BarItemContent, barItemClassName } from "./BarItemContent";

/** The notification center in a bottom sheet. A swipe down closes it. */
export const Notifications = () => {
  const { unreadCount } = useOnSiteNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger className={clsx(barItemClassName, "cursor-pointer")}>
        <BarItemContent
          icon={<FaBell />}
          label="Inbox"
          hasUnreadDot={unreadCount > 0}
        />
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/60 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />

        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end">
          <Drawer.Popup className="max-h-[80dvh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] overflow-y-auto overscroll-contain rounded-t-primary bg-neutral-800 px-4 pt-2 pb-4 outline-hidden transition-transform duration-200 ease-out data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*200ms)] data-starting-style:[transform:translateY(100%)] data-swiping:duration-0 data-swiping:select-none">
            {/* The handle shows that a swipe moves the sheet */}
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-neutral-600" />

            <Drawer.Content>
              {/* Rendered as a span so naming the sheet doesn't add an entry
                  to the page's heading outline — same as Modal. */}
              <Drawer.Title render={<span />} className="sr-only">
                Benachrichtigungen
              </Drawer.Title>

              <NotificationCenter onNavigate={() => setIsOpen(false)} />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
