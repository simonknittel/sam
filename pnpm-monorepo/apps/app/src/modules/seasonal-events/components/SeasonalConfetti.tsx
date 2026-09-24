import { ConfettiCanvas } from "@/modules/common/components/ConfettiCanvas";
import type { Options } from "canvas-confetti";
import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The surface which carries the confetti. Its size decides how far a
 * particle has to fly, thus every surface brings its own shots.
 */
export enum SeasonalConfettiPlacement {
  /** The wide but flat surface of the greeting banner */
  Banner = "banner",
  /** The login page, which is as tall as the viewport */
  LoginPage = "login-page",
}

/** Milliseconds between two bursts while a surface is in view */
const CONFETTI_INTERVAL = 1600;

/**
 * The banner is a wide but flat box. The particles are therefore slow and
 * fall back fast, so that they stay inside the banner instead of leaving it
 * through its upper edge after a few frames.
 */
const BANNER_SHOT = {
  particleCount: 10,
  spread: 70,
  startVelocity: 18,
  gravity: 0.8,
  decay: 0.92,
  scalar: 0.7,
  ticks: 150,
};

/** One shot from each lower corner, both towards the middle of the banner */
const BANNER_SHOTS = [
  { ...BANNER_SHOT, angle: 60, origin: { x: 0, y: 1 } },
  { ...BANNER_SHOT, angle: 120, origin: { x: 1, y: 1 } },
];

/**
 * The login page is as tall as the viewport, thus the particles start much
 * faster, fall more slowly and live longer than the ones of the banner: they
 * reach the middle of the page, where the hero and the login button are.
 */
const LOGIN_PAGE_SHOT = {
  particleCount: 14,
  spread: 70,
  startVelocity: 55,
  gravity: 0.5,
  decay: 0.94,
  scalar: 0.8,
  ticks: 280,
};

/** One shot from each lower corner, both towards the middle of the page */
const LOGIN_PAGE_SHOTS = [
  { ...LOGIN_PAGE_SHOT, angle: 60, origin: { x: 0, y: 1 } },
  { ...LOGIN_PAGE_SHOT, angle: 120, origin: { x: 1, y: 1 } },
];

const PLACEMENT_SHOTS: Record<SeasonalConfettiPlacement, readonly Options[]> = {
  [SeasonalConfettiPlacement.Banner]: BANNER_SHOTS,
  [SeasonalConfettiPlacement.LoginPage]: LOGIN_PAGE_SHOTS,
};

interface Props {
  readonly placement: SeasonalConfettiPlacement;
}

/**
 * The confetti of the active seasonal event, for the events which celebrate
 * with it. It renders nothing outside the greeting days of the event and
 * nothing for an event which keeps a still surface.
 *
 * The canvas covers the element which carries it and paints below the
 * content of that element, thus the element has to be positioned and
 * `isolate`.
 */
export const SeasonalConfetti = async ({ placement }: Props) => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution?.isGreetingDay || !resolution.theme.hasConfetti) return null;

  return (
    <ConfettiCanvas
      shots={PLACEMENT_SHOTS[placement]}
      intervalMilliseconds={CONFETTI_INTERVAL}
      className="absolute inset-0 -z-10 size-full"
    />
  );
};
