"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const getServerSnapshot = () => null;

const rectsAreEqual = (firstRect: DOMRect, secondRect: DOMRect) =>
  firstRect.top === secondRect.top &&
  firstRect.left === secondRect.left &&
  firstRect.width === secondRect.width &&
  firstRect.height === secondRect.height;

/**
 * Tracks the viewport rectangle of the highlighted element, following
 * scrolling, window resizes and size changes of the element itself.
 */
export const useTargetRect = (element: HTMLElement | null) => {
  /**
   * `useSyncExternalStore` subscribes again each time this function changes:
   * new listeners and a new `ResizeObserver`.
   */
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!element) return () => undefined;

      window.addEventListener("scroll", onStoreChange, true);
      window.addEventListener("resize", onStoreChange);
      const resizeObserver = new ResizeObserver(onStoreChange);
      resizeObserver.observe(element);

      return () => {
        window.removeEventListener("scroll", onStoreChange, true);
        window.removeEventListener("resize", onStoreChange);
        resizeObserver.disconnect();
      };
    },
    [element],
  );

  /**
   * `getBoundingClientRect()` returns a new object on every call, but
   * `useSyncExternalStore` needs a stable snapshot while nothing changed —
   * the previous rectangle is returned as long as it is still equal.
   */
  const lastRectRef = useRef<DOMRect | null>(null);

  const getSnapshot = () => {
    if (!element) {
      lastRectRef.current = null;
      return null;
    }

    const nextRect = element.getBoundingClientRect();
    const lastRect = lastRectRef.current;
    if (lastRect && rectsAreEqual(lastRect, nextRect)) return lastRect;

    lastRectRef.current = nextRect;
    return nextRect;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
