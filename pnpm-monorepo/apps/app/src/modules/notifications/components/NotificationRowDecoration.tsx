"use client";

import { ConfettiCanvas } from "@/modules/common/components/ConfettiCanvas";
import type { Options } from "canvas-confetti";
import clsx from "clsx";
import type { ReactNode } from "react";

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
const SHOT = {
  particleCount: 4,
  spread: 30,
  startVelocity: 17,
  gravity: 0.55,
  decay: 0.91,
  scalar: 0.6,
  ticks: 120,
};

/**
 * Call this outside of a component: a new array on every render would start the
 * animation again.
 */
export const buildConfettiShots = (
  appearance: Pick<Options, "colors" | "shapes"> = {},
): readonly Options[] => [
  { ...SHOT, ...appearance, angle: 20, origin: { x: 0, y: 1 } },
  { ...SHOT, ...appearance, angle: 160, origin: { x: 1, y: 1 } },
];

interface Props {
  readonly surfaceClassName: string;
  readonly shots: readonly Options[];
  readonly staticIcon: ReactNode;
}

/**
 * The surface and the confetti stay behind the text of the row, see the
 * `isolate` of the list item. `ConfettiCanvas` renders nothing for a viewer who
 * prefers reduced motion, thus this viewer gets the static icon.
 */
export const NotificationRowDecoration = ({
  surfaceClassName,
  shots,
  staticIcon,
}: Props) => (
  <>
    <span
      aria-hidden="true"
      className={clsx(
        surfaceClassName,
        "pointer-events-none absolute inset-0 -z-20",
      )}
    />

    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-4 -z-10 flex items-center text-3xl text-amber-400/20 motion-safe:hidden"
    >
      {staticIcon}
    </span>

    <ConfettiCanvas
      shots={shots}
      intervalMilliseconds={BURST_INTERVAL}
      className="absolute inset-0 -z-10 size-full"
    />
  </>
);
