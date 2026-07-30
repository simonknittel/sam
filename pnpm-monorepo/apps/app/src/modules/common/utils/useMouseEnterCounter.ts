import { useCallback, useRef } from "react";

export const useMouseEnterCounter = (
  onEnter: () => void,
  onLeave: () => void,
) => {
  const mouseEnterCounter = useRef(0);

  const handleMouseEnter = () => {
    mouseEnterCounter.current += 1;
    onEnter();
  };

  const handleMouseLeave = () => {
    mouseEnterCounter.current = Math.max(0, mouseEnterCounter.current - 1);
    if (mouseEnterCounter.current > 0) return;

    onLeave();
  };

  const reset = useCallback(() => {
    mouseEnterCounter.current = 0;
  }, []);

  return {
    handleMouseEnter,
    handleMouseLeave,
    reset,
  };
};
