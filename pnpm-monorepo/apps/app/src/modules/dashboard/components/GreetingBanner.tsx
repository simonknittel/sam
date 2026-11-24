import { BannerClouds } from "@/modules/common/components/BannerClouds";
import { ConfettiCanvas } from "@/modules/common/components/ConfettiCanvas";
import type { ReactNode } from "react";

/** For the end-to-end tests */
export enum GreetingBannerMarker {
  Welcome = "data-welcome-banner",
  Birthday = "data-birthday-banner",
  Seasonal = "data-seasonal-banner",
}

const TITLE_ELEMENT_ID = "greeting-banner-title";

/** Milliseconds */
const CONFETTI_INTERVAL = 1600;

/**
 * The banner is a wide but flat box. The particles are therefore slow and
 * fall back fast, so that they stay inside the banner instead of leaving it
 * through its upper edge after a few frames.
 */
const CONFETTI_SHOT = {
  particleCount: 10,
  spread: 70,
  startVelocity: 18,
  gravity: 0.8,
  decay: 0.92,
  scalar: 0.7,
  ticks: 150,
};

const CONFETTI_SHOTS = [
  { ...CONFETTI_SHOT, angle: 60, origin: { x: 0, y: 1 } },
  { ...CONFETTI_SHOT, angle: 120, origin: { x: 1, y: 1 } },
];

interface Props {
  readonly marker: GreetingBannerMarker;
  readonly surfaceClassName: string;
  readonly hasConfetti: boolean;
  /** Fills the box that the banner gives it */
  readonly ornament: ReactNode;
  readonly title: string;
  readonly body: string;
  readonly callToAction?: ReactNode;
}

/**
 * A greeting is content and not a message of the moment, thus it is no live
 * region.
 *
 * The ornament rises above the upper edge of the banner. The surface is thus a
 * layer of its own: it clips the confetti and the colour clouds at its round
 * corners, but not the ornament. On a small viewport the ornament would squeeze
 * the text into a narrow column, thus it does not show.
 *
 * The ornament lets every pointer through: a click or a drag of text over the
 * drawing must reach what lies beneath it.
 */
export const GreetingBanner = ({
  marker,
  surfaceClassName,
  hasConfetti,
  ornament,
  title,
  body,
  callToAction,
}: Props) => (
  <section
    {...{ [marker]: true }}
    aria-labelledby={TITLE_ELEMENT_ID}
    className="relative text-text-primary"
  >
    {/* The surface isolates itself, thus the colour clouds and the confetti
    stay behind the greeting. The clouds lie below the confetti, which paints
    at `-z-10`. */}
    <div className="absolute inset-0 isolate overflow-hidden rounded-primary bg-secondary">
      <BannerClouds surfaceClassName={surfaceClassName} className="-z-20" />

      {hasConfetti && (
        <ConfettiCanvas
          shots={CONFETTI_SHOTS}
          intervalMilliseconds={CONFETTI_INTERVAL}
          className="absolute inset-0 -z-10 size-full"
        />
      )}
    </div>

    <div
      aria-hidden
      className="pointer-events-none absolute -top-3 left-3 hidden size-28 sm:block"
    >
      {ornament}
    </div>

    <div className="relative flex flex-col gap-1 p-6 sm:pl-36">
      <h2
        id={TITLE_ELEMENT_ID}
        className="font-mono text-2xl font-thin uppercase"
      >
        {title}
      </h2>

      <p>{body}</p>

      {/* A call to action can render nothing, and then its row must not
      add space below the body */}
      <div className="mt-3 flex empty:hidden">{callToAction}</div>
    </div>
  </section>
);
