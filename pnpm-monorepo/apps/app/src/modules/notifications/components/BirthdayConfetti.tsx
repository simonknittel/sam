"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import type { CreateTypes } from "canvas-confetti";
import { useEffect, useRef } from "react";
import { TbConfetti } from "react-icons/tb";

/**
 * Milliseconds between two bursts while the row is in view. One burst lasts
 * a little longer than this, thus the bursts overlap and the row keeps
 * sprinkling instead of blinking.
 */
const BURST_INTERVAL = 1200;

/**
 * A gentle sprinkle inside one list row, not a fireworks display: a handful
 * of small particles which drift down over the height of the row.
 */
const BURST_OPTIONS = {
  particleCount: 7,
  angle: 270,
  spread: 140,
  startVelocity: 6,
  gravity: 0.22,
  decay: 0.93,
  scalar: 0.6,
  ticks: 200,
  origin: { x: 0.5, y: 0 },
};

/**
 * The birthday greeting celebrates itself: the row of the notification keeps
 * dropping confetti while it is in view. The animation lives inside the row,
 * behind its text — see the `isolate` of the list item.
 */
export const BirthdayConfetti = () => {
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

    const stop = () => {
      clearInterval(burstTimer);
      burstTimer = undefined;
    };

    const start = () => {
      if (burstTimer || !fireConfetti) return;

      void fireConfetti(BURST_OPTIONS);
      burstTimer = setInterval(() => {
        void fireConfetti?.(BURST_OPTIONS);
      }, BURST_INTERVAL);
    };

    /**
     * A list of many rows must not animate the rows nobody looks at. The
     * root is the viewport, and the scroll container of the list clips the
     * intersection with it, thus a row which is scrolled out of the list
     * stops as well.
     */
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });

    /**
     * The library is loaded only for the rows which need it, and it draws
     * into this canvas instead of a page-wide one. The worker mode is off,
     * so that the animation behaves the same in the browser and in the
     * Playwright suite.
     */
    void import("canvas-confetti").then((module) => {
      if (isCancelled) return;

      fireConfetti = module.default.create(canvas, {
        resize: true,
        useWorker: false,
      });
      observer.observe(canvas);
    });

    return () => {
      isCancelled = true;
      stop();
      observer.disconnect();
      fireConfetti?.reset();
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion)
    return (
      <span
        data-birthday-confetti-static
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-4 -z-10 flex items-center text-3xl text-amber-400/20"
      >
        <TbConfetti />
      </span>
    );

  return (
    <canvas
      ref={canvasRef}
      data-birthday-confetti
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full"
    />
  );
};
