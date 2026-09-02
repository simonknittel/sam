"use client";

import { useMediaQuery } from "@base-ui/react/unstable-use-media-query";
import type { CreateTypes } from "canvas-confetti";
import { useEffect, useRef } from "react";
import { TbConfetti } from "react-icons/tb";

/**
 * Milliseconds between two bursts while the row is in view. The particles
 * live longer than this, thus the bursts overlap and the row shows a
 * continuous animation.
 */
const BURST_INTERVAL = 1200;

/**
 * A small number of particles per shot. The values keep the animation calm:
 * a row in a long list must not draw the attention away from the other rows.
 * A row is much wider than it is high, thus the shots stay flat and the
 * particles reach the middle without leaving the row at the top.
 */
const BURST_OPTIONS = {
  particleCount: 4,
  spread: 30,
  startVelocity: 17,
  gravity: 0.55,
  decay: 0.91,
  scalar: 0.6,
  ticks: 120,
};

/** One shot from each lower corner, both towards the middle of the row */
const CANNONS = [
  { angle: 20, origin: { x: 0, y: 1 } },
  { angle: 160, origin: { x: 1, y: 1 } },
];

/**
 * Confetti for the row of a birthday greeting. The animation stays inside
 * the row and behind its text — see the `isolate` of the list item.
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

    const fireBurst = () => {
      for (const cannon of CANNONS) {
        void fireConfetti?.({ ...BURST_OPTIONS, ...cannon });
      }
    };

    const start = () => {
      if (burstTimer || !fireConfetti) return;

      fireBurst();
      burstTimer = setInterval(fireBurst, BURST_INTERVAL);
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
        // A chunk which does not load leaves the row without its
        // decoration. An unhandled rejection would open the error overlay
        // and reach the error tracking, which a decoration must not do.
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
