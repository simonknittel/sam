import { ConfettiCanvas } from "@/modules/common/components/ConfettiCanvas";
import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/** Milliseconds between two bursts while the page is in view */
const CONFETTI_INTERVAL = 1600;

/**
 * The login page is as tall as the viewport, thus the particles start much
 * faster, fall more slowly and live longer than the ones of the greeting
 * banner: they reach the middle of the page, where the hero and the login
 * button are.
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

/**
 * The confetti of the active seasonal event on the login page, for the
 * events which celebrate with it. It renders nothing outside the greeting
 * days of the event and nothing for an event without confetti.
 * The greeting banner of the dashboard brings its own confetti, see
 * `GreetingBanner`.
 *
 * The canvas covers the element which carries it and paints below the
 * content of that element, thus the element has to be positioned and
 * `isolate`.
 */
export const SeasonalConfetti = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution?.isGreetingDay || !resolution.theme.hasConfetti) return null;

  return (
    <ConfettiCanvas
      shots={LOGIN_PAGE_SHOTS}
      intervalMilliseconds={CONFETTI_INTERVAL}
      className="absolute inset-0 -z-10 size-full"
    />
  );
};
