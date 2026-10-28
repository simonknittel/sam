import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * The band from the left edge of the viewport where a swipe opens the closed
 * drawer (px). The band starts after the outer pixels: there, the browser and
 * the operating system start their swipe-back gesture.
 */
const OPEN_BAND_START = 32;
const OPEN_BAND_END = 128;
/** The movement before a gesture locks to the horizontal axis or stops (px) */
const AXIS_LOCK_DISTANCE = 8;
/**
 * The largest angle below the horizontal (degrees) for a swipe that opens the
 * drawer. The swipe-back gesture of the operating system starts only on an
 * almost horizontal swipe, thus a diagonal swipe can go past it. A steeper
 * swipe is a scroll.
 */
const MAXIMUM_OPEN_ANGLE = 60;
const MAXIMUM_OPEN_SLOPE = Math.tan((MAXIMUM_OPEN_ANGLE * Math.PI) / 180);
/** A flick faster than this (px/ms) decides, independently of its distance */
const FLING_VELOCITY = 0.5;

interface Gesture {
  readonly startX: number;
  readonly startY: number;
  readonly width: number;
  /** The translation of the panel at the start: 0 when open, -width when closed */
  readonly startTranslate: number;
  readonly isOpening: boolean;
  isLocked: boolean;
  translate: number;
  lastX: number;
  lastTimeStamp: number;
  velocity: number;
}

export interface DrawerDrag {
  /** The translation of the panel (px), from -width (closed) to 0 (open) */
  readonly translate: number;
  /** From 0 (closed) to 1 (open) */
  readonly progress: number;
}

interface Options {
  readonly panelRef: RefObject<HTMLElement | null>;
  readonly backdropRef: RefObject<HTMLElement | null>;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
}

/**
 * Opens and closes a drawer on the left edge with swipes: a swipe to the
 * right from the left edge pulls the closed drawer in, a swipe to the left
 * pushes the open drawer out. During the swipe, the panel follows the finger.
 * On release, the distance and the speed of the flick decide.
 *
 * Returns the live position while a swipe moves the panel, else null.
 */
export const useDrawerSwipe = ({
  panelRef,
  backdropRef,
  isOpen,
  onOpenChange,
}: Options) => {
  const gestureRef = useRef<Gesture | null>(null);
  const [drag, setDrag] = useState<DrawerDrag | null>(null);

  const readIsOpen = useEffectEvent(() => isOpen);
  const changeOpen = useEffectEvent((nextIsOpen: boolean) =>
    onOpenChange(nextIsOpen),
  );

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const panel = panelRef.current;
      const touch = event.touches[0];
      if (gestureRef.current || !panel || !touch) return;

      /** Zero while a large viewport hides the action bar */
      const width = panel.offsetWidth;
      if (width === 0) return;

      const isOpening = !readIsOpen();
      const canStart = isOpening
        ? canStartOpening(panel, touch.clientX, event.target)
        : canStartClosing(panel, backdropRef.current, event.target);
      if (!canStart) return;

      const startTranslate = isOpening ? -width : 0;
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        width,
        startTranslate,
        isOpening,
        isLocked: false,
        translate: startTranslate,
        lastX: touch.clientX,
        lastTimeStamp: event.timeStamp,
        velocity: 0,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (!gesture.isLocked) {
        if (
          Math.abs(deltaX) < AXIS_LOCK_DISTANCE &&
          Math.abs(deltaY) < AXIS_LOCK_DISTANCE
        )
          return;

        const isHorizontal = gesture.isOpening
          ? deltaX > 0 && Math.abs(deltaY) <= MAXIMUM_OPEN_SLOPE * deltaX
          : Math.abs(deltaX) > Math.abs(deltaY);
        if (!isHorizontal) {
          gestureRef.current = null;
          return;
        }

        gesture.isLocked = true;
      }

      /** The swipe moves the panel, not the page */
      event.preventDefault();

      if (event.timeStamp > gesture.lastTimeStamp)
        gesture.velocity =
          (touch.clientX - gesture.lastX) /
          (event.timeStamp - gesture.lastTimeStamp);
      gesture.lastX = touch.clientX;
      gesture.lastTimeStamp = event.timeStamp;

      gesture.translate = Math.min(
        0,
        Math.max(-gesture.width, gesture.startTranslate + deltaX),
      );
      setDrag({
        translate: gesture.translate,
        progress: (gesture.translate + gesture.width) / gesture.width,
      });
    };

    const handleTouchEnd = () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (!gesture?.isLocked) return;

      if (gesture.velocity > FLING_VELOCITY) {
        changeOpen(true);
      } else if (gesture.velocity < -FLING_VELOCITY) {
        changeOpen(false);
      } else {
        changeOpen(gesture.translate > -gesture.width / 2);
      }
      setDrag(null);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [panelRef, backdropRef]);

  return drag;
};

const canStartOpening = (
  panel: HTMLElement,
  clientX: number,
  target: EventTarget | null,
) => {
  if (clientX < OPEN_BAND_START || clientX > OPEN_BAND_END) return false;

  /** An open modal dialog hides the rest of the page, also the drawer */
  if (panel.closest('[aria-hidden="true"]')) return false;

  return !isInScrolledElement(target);
};

/**
 * Only a swipe on the drawer or its backdrop closes the drawer. A popover of
 * the drawer is in a portal outside of it and keeps its own touches.
 */
const canStartClosing = (
  panel: HTMLElement,
  backdrop: HTMLElement | null,
  target: EventTarget | null,
) =>
  target instanceof Node &&
  (panel.contains(target) || Boolean(backdrop?.contains(target)));

/**
 * A swipe to the right also scrolls a horizontally scrolled element (for
 * example a wide table) back to its start. Such a swipe stays with the
 * element.
 */
const isInScrolledElement = (target: EventTarget | null) => {
  for (
    let element = target instanceof Element ? target : null;
    element;
    element = element.parentElement
  ) {
    if (element.scrollLeft > 0) return true;
  }

  return false;
};
