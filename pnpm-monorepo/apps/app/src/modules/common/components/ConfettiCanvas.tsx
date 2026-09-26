"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import type { CreateTypes, Options } from "canvas-confetti";
import clsx from "clsx";
import { useEffect, useRef } from "react";

interface Props {
  /**
   * The shots of one burst. Every shot is one call of the library, thus a
   * burst can come from more than one origin. Keep the array outside of the
   * component which renders this one: a new array on every render would
   * start the animation again.
   */
  readonly shots: readonly Options[];
  /** Milliseconds between two bursts while the canvas is in view */
  readonly intervalMilliseconds: number;
  /** Places and sizes the canvas over the element which positions it */
  readonly className?: string;
}

/**
 * A canvas which repeats a burst of confetti while it is in view. The caller
 * places the canvas and describes the shots, thus the same animation works
 * over a row of a list and over an avatar. Nothing renders for a viewer who
 * prefers reduced motion.
 */
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
     * The library is loaded only for the elements which need it, and it
     * draws into this canvas instead of a page-wide one. The worker mode is
     * off, so that the animation behaves the same in the browser and in the
     * Playwright suite.
     */
    void import("canvas-confetti")
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
      data-confetti-canvas
      aria-hidden="true"
      className={clsx(className, "pointer-events-none")}
    />
  );
};
