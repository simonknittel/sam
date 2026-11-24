"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import type { CreateTypes, Options } from "canvas-confetti";
import clsx from "clsx";
import { useEffect, useRef } from "react";

interface Props {
  /**
   * Keep the array outside of the component which renders this one: a new array
   * on every render would start the animation again.
   */
  readonly shots: readonly Options[];
  readonly intervalMilliseconds: number;
  readonly className?: string;
}

/** The React Compiler does not compile a component with an `import()` */
const loadCanvasConfetti = () => import("canvas-confetti");

export const ConfettiCanvas = ({
  shots,
  intervalMilliseconds,
  className,
}: Props) => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    { defaultMatches: false },
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (prefersReducedMotion || !canvas) return;

    let isCancelled = false;
    let fireConfetti: CreateTypes | undefined;
    let burstTimer: ReturnType<typeof setInterval> | undefined;
    let isIntersecting = false;

    const stop = () => {
      clearInterval(burstTimer);
      burstTimer = undefined;
    };

    const fireBurst = () => {
      for (const shot of shots) void fireConfetti?.(shot);
    };

    const start = () => {
      if (burstTimer || !fireConfetti) return;

      fireBurst();
      burstTimer = setInterval(fireBurst, intervalMilliseconds);
    };

    const startOrStop = () => {
      if (isIntersecting && document.visibilityState === "visible") start();
      else stop();
    };

    /**
     * A list of many rows must not animate the rows nobody looks at. The
     * root is the viewport, and a scroll container between them clips the
     * intersection with it, thus a canvas which is scrolled out of such a
     * container stops as well. The last entry has the current state when
     * the browser sends more than one change at a time.
     */
    const observer = new IntersectionObserver((entries) => {
      isIntersecting = entries.at(-1)?.isIntersecting ?? false;
      startOrStop();
    });

    /**
     * A hidden tab continues to run the timer, but not the animation frames.
     * The library removes particles only in its animation frames, thus the
     * bursts of a hidden tab collect until the user comes back. The reset
     * drops the particles which are in the queue.
     */
    const handleVisibilityChange = () => {
      startOrStop();
      if (document.visibilityState === "hidden") fireConfetti?.reset();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    /**
     * The worker mode is off, so that the animation behaves the same in the
     * browser and in the Playwright suite.
     */
    void loadCanvasConfetti()
      .then((module) => {
        if (isCancelled) return;

        fireConfetti = module.default.create(canvas, {
          resize: true,
          useWorker: false,
        });
        observer.observe(canvas);
      })
      .catch(() => {
        // A chunk which does not load leaves the element without its
        // decoration. An unhandled rejection would open the error overlay
        // and reach the error tracking, which a decoration must not do.
      });

    return () => {
      isCancelled = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      fireConfetti?.reset();
    };
  }, [prefersReducedMotion, shots, intervalMilliseconds]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={clsx(className, "pointer-events-none")}
    />
  );
};
