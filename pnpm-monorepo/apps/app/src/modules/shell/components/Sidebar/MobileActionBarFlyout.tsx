"use client";

import { UnreadDot } from "@/modules/common/components/UnreadDot";
import { useOnSiteNotifications } from "@/modules/notifications/components/OnSiteNotificationsProvider";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
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
  const flyoutId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsVisible(false);
  }

  /**
   * A popover inside the flyout renders in a portal. Its Escape key also
   * arrives here through the React tree, but it must close only the popover.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !isVisible) return;
    if (!event.currentTarget.contains(event.target as Node)) return;

    setIsVisible(false);
    toggleRef.current?.focus();
  };

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => setIsVisible((value) => !value)}
        onKeyDown={handleKeyDown}
        type="button"
        aria-expanded={isVisible}
        aria-controls={flyoutId}
        className="flex h-full flex-col items-center justify-center rounded-secondary px-4 active:bg-neutral-700"
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
        id={flyoutId}
        // The closed flyout only moves off-screen. Thus it must also leave
        // the focus order and the accessibility tree.
        inert={!isVisible}
        onKeyDown={handleKeyDown}
        className={clsx(
          "fixed top-0 bottom-0 left-0 z-50 flex w-96 max-w-[90dvw] flex-col overflow-auto bg-neutral-800/90 shadow-sm backdrop-blur-sm transition-transform",
          {
            "-translate-x-full": isVisible === false,
            "translate-x-0": isVisible === true,
          },
        )}
      >
        <MobileActionBarFlyoutVisibilityContext value={isVisible}>
          {children}
        </MobileActionBarFlyoutVisibilityContext>
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
