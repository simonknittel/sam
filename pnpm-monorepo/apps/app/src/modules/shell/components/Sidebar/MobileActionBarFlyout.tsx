"use client";

import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { AiFillAppstore } from "react-icons/ai";
import { FaTimes } from "react-icons/fa";

/**
 * The flyout stays mounted while it is translated off-screen, so content
 * which must react to the flyout closing (e.g. the notification popover
 * dismissing itself) reads this.
 */
const MobileActionBarFlyoutVisibilityContext = createContext(false);

export function useMobileActionBarFlyoutVisibility() {
  return useContext(MobileActionBarFlyoutVisibilityContext);
}

interface Props {
  readonly children?: ReactNode;
}

export const MobileActionBarFlyout = ({ children }: Props) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const { unreadCount } = useOnSiteNotifications();

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsVisible(false);
  }

  return (
    <>
      <button
        onClick={() => setIsVisible((value) => !value)}
        type="button"
        className="flex flex-col items-center justify-center px-4 h-full active:bg-neutral-700 rounded-secondary"
      >
        <span className="relative">
          {isVisible ? <FaTimes /> : <AiFillAppstore />}
          {unreadCount > 0 && (
            <UnreadDot className="absolute -top-1 -right-2" />
          )}
        </span>
        <span className="text-xs">Apps</span>
      </button>

      <div
        className={clsx(
          "fixed left-0 top-0 bottom-0 w-96 max-w-[90dvw] z-50 flex flex-col bg-neutral-800/90 backdrop-blur-sm shadow-sm overflow-auto transition-transform",
          {
            "-translate-x-full": isVisible === false,
            "translate-x-0": isVisible === true,
          },
        )}
      >
        <MobileActionBarFlyoutVisibilityContext.Provider value={isVisible}>
          {children}
        </MobileActionBarFlyoutVisibilityContext.Provider>
      </div>

      {isVisible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsVisible(false)}
        />
      )}
    </>
  );
};
