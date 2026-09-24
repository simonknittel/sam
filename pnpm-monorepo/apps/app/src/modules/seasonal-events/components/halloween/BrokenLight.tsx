"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { BARE_BULB_GLASS_CENTRE } from "./bareBulbPlace";
import { useIsLitPage } from "./useIsLitPage";

/**
 * The radius of the pool of light, where the page keeps its full brightness,
 * as a fraction of the distance from the bulb to the farthest corner of the
 * viewport. At a viewport of 1440 by 900 pixels the pool reaches about 100
 * pixels.
 */
const POOL_RADIUS = 0.08;

/**
 * The radius from which the page has the full darkness, as the same
 * fraction. Most of the page lies nearer to the bulb than the farthest
 * corner, thus a curve which ends only in that corner leaves most of the
 * page almost as bright as the pool.
 */
const DARK_RADIUS = 0.75;

/**
 * How much darker the page is outside the dark radius. The page is almost
 * black, thus a smaller value is hard to see. The theme is a decoration of
 * one month which each viewer can switch off, thus the vignette may take
 * contrast from the text in the dark part of the page (for example, hovered
 * red links and grey dates get below WCAG AA there).
 */
const FULL_DARKNESS = 0.6;

/** The number of linear parts of the curve from the pool to the dark radius */
const CURVE_PART_COUNT = 8;

/**
 * The brightness which the page keeps in the deepest dip. When the only
 * light fails, the page is everywhere as dark as its darkest part: the pool
 * goes dark, and the dark part stays as it is.
 */
const DIP_BRIGHTNESS = 1 - FULL_DARKNESS;

/**
 * The opacity of the flat sheet on a page without the vignette. Such a page
 * is bright at rest, thus a dip of 40 % is enough to show the failure there,
 * and the page stays readable during a dip.
 */
const FLAT_SHEET_OPACITY = 0.4;

/**
 * The stops of the light from the edge of the pool to the dark radius. The
 * darkness follows a smooth curve (smoothstep), thus the pool and the dark
 * part have no visible edge.
 */
const LIGHT_STOPS = Array.from(
  { length: CURVE_PART_COUNT + 1 },
  (unused, index) => {
    const progress = index / CURVE_PART_COUNT;

    return {
      distance: POOL_RADIUS + (DARK_RADIUS - POOL_RADIUS) * progress,
      darkness: FULL_DARKNESS * progress * progress * (3 - 2 * progress),
    };
  },
);

/**
 * A circle of black around the bulb, whose last stop keeps its colour to the
 * farthest corner of the viewport. The callback gives the opacity of the
 * black at a stop from the darkness of the vignette at that stop.
 */
const getLightGradient = (getOpacity: (darkness: number) => number) => {
  const stops = LIGHT_STOPS.map(
    ({ distance, darkness }) =>
      `rgb(0 0 0 / ${getOpacity(darkness).toFixed(4)}) ${(distance * 100).toFixed(1)}%`,
  );

  return `radial-gradient(circle at ${BARE_BULB_GLASS_CENTRE}, ${stops.join(", ")})`;
};

/**
 * The opacity of the dark sheet above a point of the vignette.
 *
 * A black layer with the opacity `a` lets `1 - a` of the brightness of the
 * page through, and two black layers multiply. The vignette lets
 * `1 - darkness` through. The sheet at full opacity lets
 * `DIP_BRIGHTNESS / (1 - darkness)` through, thus the two layers together
 * let `DIP_BRIGHTNESS` through at every point. The sheet is thus darkest in
 * the pool and invisible in the dark part of the page.
 */
const getSheetOpacity = (darkness: number) =>
  1 - DIP_BRIGHTNESS / (1 - darkness);

/**
 * Both gradients have the same stops. Between two stops the sheet is less
 * than 0.4 % of the brightness away from the exact value, which is less than
 * one step of a colour channel.
 */
const LIGHT_LAYERS = {
  "--broken-light-vignette": getLightGradient((darkness) => darkness),
  "--broken-light-sheet": getLightGradient(getSheetOpacity),
  "--broken-light-flat-sheet": `rgb(0 0 0 / ${FLAT_SHEET_OPACITY})`,
} satisfies CSSProperties;

/**
 * The bare bulb is the only light of the page, and now and then it fails.
 *
 * The light: on the pages which the bulb lights (see `useIsLitPage`), a
 * vignette makes the page darker with the distance from the bulb, thus a
 * pool of light stays around the bulb and the part of the page far from the
 * bulb is dark. The vignette does not move. Every other page keeps its full
 * brightness at rest.
 *
 * The failure: a dark sheet above the page makes the page darker two or
 * three times in less than one second, on every page. The motion token sets
 * the times of the dips and proves that they are safe for photosensitive
 * viewers. Above the vignette, the sheet has the shape of the inverse of the
 * vignette, thus at full opacity the page is equally dark everywhere and the
 * pool of light is gone. Without the vignette the sheet is flat and less
 * dark. The unlit bulb uses the same token, thus the page goes dark in the
 * same frame as the bulb.
 *
 * Both layers are pure black. A layer of another colour adds its colour to
 * the page, and no black sheet can remove that colour again, thus a warm
 * glow would stay visible in a dip.
 *
 * The browser paints the gradients one time. Only the opacity of the sheet
 * moves, thus a dip does not make the browser paint the page again. A viewer
 * who prefers reduced motion keeps the vignette, and the sheet stays
 * invisible. A viewer who prefers more contrast gets no vignette and the
 * flat sheet, thus the page is equally dark everywhere in a dip and never
 * darker at rest. The layers are custom properties, because a variant class
 * cannot change an inline background. The light shows only where the bulb
 * shows, thus the page never flickers without the bulb that explains it.
 */
export const BrokenLight = () => {
  const isLitPage = useIsLitPage();

  return (
    <div className="absolute inset-0 hidden xl:block" style={LIGHT_LAYERS}>
      {isLitPage && (
        <div className="absolute inset-0 bg-(image:--broken-light-vignette) contrast-more:bg-none" />
      )}

      <div
        className={clsx(
          "absolute inset-0 opacity-0 animate-seasonal-power-flicker",
          {
            "bg-(image:--broken-light-sheet) contrast-more:bg-none contrast-more:bg-(color:--broken-light-flat-sheet)":
              isLitPage,
            "bg-(color:--broken-light-flat-sheet)": !isLitPage,
          },
        )}
      />
    </div>
  );
};
