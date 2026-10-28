"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AiFillAppstore } from "react-icons/ai";
import { FaTimes } from "react-icons/fa";
import { BarItemContent, barItemClassName } from "./BarItemContent";
import { useDrawerSwipe } from "./useDrawerSwipe";

interface MobileActionBarFlyoutContext {
  /**
   * The flyout stays mounted while it is translated off-screen. Thus content
   * which must react to the close of the flyout (for example a popover which
   * closes with it) reads this.
   */
  readonly isVisible: boolean;
  /**
   * True when the flyout is visible and its slide-in transition has ended.
   * Base UI calculates the position of a popup from its trigger, and the
   * trigger moves during the transition. Thus a popover which opens without
   * a press on its trigger waits for this.
   */
  readonly isSlideInComplete: boolean;
  readonly show: () => void;
  readonly hide: () => void;
}

const MobileActionBarFlyoutContext = createContext<
  MobileActionBarFlyoutContext | undefined
>(undefined);

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export function useMobileActionBarFlyout() {
  const context = useContext(MobileActionBarFlyoutContext);
  if (!context)
    throw new Error("[MobileActionBarFlyoutContext] Provider is missing!");
  return context;
}

interface Props {
  readonly children?: ReactNode;
  /** Whether an app in the flyout has new items */
  readonly hasUnreadDot: boolean;
}

/**
 * The toggle of the action bar and the flyout with the navigation. Also a
 * swipe from the left edge opens the flyout, and a swipe to the left closes
 * it (see `useDrawerSwipe`).
 */
export const MobileActionBarFlyout = ({ children, hasUnreadDot }: Props) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isSlideInComplete, setIsSlideInComplete] = useState(false);
  const flyoutId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const drag = useDrawerSwipe({
    panelRef: flyoutRef,
    backdropRef,
    isOpen: isVisible,
    onOpenChange: setIsVisible,
  });

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setIsVisible(false);
  }

  if (!isVisible && isSlideInComplete) setIsSlideInComplete(false);

  /**
   * The same method as Base UI. `getAnimations()` applies the new classes
   * first, thus it gives the transition that they start. When the viewer
   * prefers reduced motion, the duration is 0 s: there is no transition and
   * no `transitionend` event, and the list is empty. A close during the
   * slide-in cancels the wait.
   */
  useEffect(() => {
    const flyout = flyoutRef.current;
    if (!isVisible || !flyout) return;

    let isCancelled = false;

    void Promise.allSettled(
      flyout.getAnimations().map((animation) => animation.finished),
    ).then(() => {
      if (!isCancelled) setIsSlideInComplete(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [isVisible]);

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

  const contextValue = {
    isVisible,
    isSlideInComplete,
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false),
  };

  /** From 0 (closed) to 1 (open) */
  const progress = drag ? drag.progress : Number(isVisible);

  return (
    <>
      <button
        ref={toggleRef}
        onClick={() => setIsVisible((value) => !value)}
        onKeyDown={handleKeyDown}
        type="button"
        aria-expanded={isVisible}
        aria-controls={flyoutId}
        className={clsx(barItemClassName, "cursor-pointer")}
      >
        <BarItemContent
          icon={isVisible ? <FaTimes /> : <AiFillAppstore />}
          label="Apps"
          hasUnreadDot={hasUnreadDot}
        />
      </button>

      <div
        className={clsx("fixed inset-0 z-50", {
          "pointer-events-none": !isVisible && !drag,
        })}
      >
        <div
          ref={backdropRef}
          onClick={() => setIsVisible(false)}
          style={{ opacity: progress }}
          className={clsx("absolute inset-0 bg-black/60", {
            "transition-opacity duration-200 ease-out": !drag,
          })}
        />

        <div
          ref={flyoutRef}
          id={flyoutId}
          // The closed flyout only moves off-screen. Thus it must also leave
          // the focus order and the accessibility tree.
          inert={!isVisible}
          onKeyDown={handleKeyDown}
          style={drag ? { translate: `${drag.translate}px 0` } : undefined}
          className={clsx(
            "absolute inset-y-0 left-0 flex w-96 max-w-[90dvw] flex-col overflow-auto overscroll-contain bg-neutral-800 shadow-sm",
            {
              "transition-transform duration-200 ease-out": !drag,
              "-translate-x-full": !drag && !isVisible,
              "translate-x-0": !drag && isVisible,
            },
          )}
        >
          <MobileActionBarFlyoutContext value={contextValue}>
            {children}
          </MobileActionBarFlyoutContext>
        </div>
      </div>
    </>
  );
};
