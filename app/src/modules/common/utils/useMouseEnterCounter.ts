import { useCallback, useRef } from "react";

export const useMouseEnterCounter = (
  onEnter: () => void,
  onLeave: () => void,
  hoverDelay?: number,
) => {
  const mouseEnterCounter = useRef(0);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    mouseEnterCounter.current += 1;

    if (hoverDelay && hoverDelay > 0) {
      if (delayTimer.current) clearTimeout(delayTimer.current);
      delayTimer.current = setTimeout(() => {
        delayTimer.current = null;
        if (mouseEnterCounter.current > 0) {
          onEnter();
        }
      }, hoverDelay);
    } else {
      onEnter();
    }
  };

  const handleMouseLeave = () => {
    mouseEnterCounter.current = Math.max(0, mouseEnterCounter.current - 1);
    if (mouseEnterCounter.current > 0) return;

    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }

    onLeave();
  };

  const reset = useCallback(() => {
    mouseEnterCounter.current = 0;
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
  }, []);

  return {
    handleMouseEnter,
    handleMouseLeave,
    reset,
  };
};
