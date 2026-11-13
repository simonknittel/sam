import { useRef, useState, type PointerEvent } from "react";

/** The movement before a swipe locks to the horizontal axis or stops (px) */
const AXIS_LOCK_DISTANCE = 8;
/** The part of the row width that a swipe must pass to start its action */
const ACTION_DISTANCE_FRACTION = 0.35;

interface Gesture {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly width: number;
  isLocked: boolean;
  offset: number;
}

export interface NotificationSwipe {
  /** The horizontal translation of the row (px), negative to the left */
  readonly offset: number;
  /** True while the row follows the finger, thus without a transition */
  readonly isDragging: boolean;
  /** True when the release of the finger starts the action of the swipe */
  readonly isArmed: boolean;
}

const restingSwipe: NotificationSwipe = {
  offset: 0,
  isDragging: false,
  isArmed: false,
};

interface Options {
  readonly isEnabled: boolean;
  /** After the release of a swipe to the right. The row moves back. */
  readonly onSwipeRight: () => void;
  /**
   * After the release of a swipe to the left. The row moves out and stays
   * out until the promise resolves. A row that is still there then (for
   * example after an error) moves back.
   */
  readonly onSwipeLeft: () => Promise<void>;
}

/**
 * Swipes of a finger on a notification row. During the swipe, the row
 * follows the finger. A release after a sufficient distance starts the action
 * of the direction. A vertical movement stays a scroll of the list: the row
 * must have `touch-action: pan-y`.
 */
export const useNotificationSwipe = ({
  isEnabled,
  onSwipeRight,
  onSwipeLeft,
}: Options) => {
  const gestureRef = useRef<Gesture | null>(null);
  const isLeavingRef = useRef(false);
  const [swipe, setSwipe] = useState(restingSwipe);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      !isEnabled ||
      event.pointerType !== "touch" ||
      !event.isPrimary ||
      isLeavingRef.current
    )
      return;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: event.currentTarget.offsetWidth,
      isLocked: false,
      offset: 0,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;

    if (!gesture.isLocked) {
      const deltaY = event.clientY - gesture.startY;
      if (
        Math.abs(deltaX) < AXIS_LOCK_DISTANCE &&
        Math.abs(deltaY) < AXIS_LOCK_DISTANCE
      )
        return;

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        gestureRef.current = null;
        return;
      }

      gesture.isLocked = true;
    }

    gesture.offset = Math.min(gesture.width, Math.max(-gesture.width, deltaX));
    setSwipe({
      offset: gesture.offset,
      isDragging: true,
      isArmed: isPastActionDistance(gesture),
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;

    gestureRef.current = null;
    if (!gesture.isLocked) return;

    if (!isPastActionDistance(gesture)) {
      setSwipe(restingSwipe);
      return;
    }

    if (gesture.offset > 0) {
      onSwipeRight();
      /** Keeps the colour of the action while the row moves back */
      setSwipe({ offset: 0, isDragging: false, isArmed: true });
      return;
    }

    isLeavingRef.current = true;
    setSwipe({ offset: -gesture.width, isDragging: false, isArmed: true });
    void onSwipeLeft().finally(() => {
      isLeavingRef.current = false;
      setSwipe(restingSwipe);
    });
  };

  /** For example when the browser takes the touch for a scroll */
  const handlePointerCancel = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;

    gestureRef.current = null;
    if (gesture.isLocked) setSwipe(restingSwipe);
  };

  return {
    swipe,
    swipeHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
};

const isPastActionDistance = (gesture: Gesture) =>
  Math.abs(gesture.offset) >= gesture.width * ACTION_DISTANCE_FRACTION;
