"use client";

import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import type { StaticImageData } from "next/image";
import fogBack from "../../assets/halloween/fog-back.svg";
import fogFront from "../../assets/halloween/fog-front.svg";
import { useIsLitPage } from "./useIsLitPage";

/**
 * A thin bank of fog which drifts slowly to the right along the lower edge of
 * the viewport. The fog is densest at the lower edge and becomes thinner to
 * the top, where it ends in soft billows.
 *
 * Two banks give depth: the back bank is 96 pixels high, fainter and slower,
 * and the front bank is 64 pixels high, denser and faster. The files set
 * these heights and the densities. At the lower edge the two banks together
 * cover the page with about 21 % of the colour of the fog, and 40 pixels
 * higher with about 8 %, thus text in the fog stays easy to read. The band
 * stays below 14 % of a viewport of 720 pixels, which is the lowest usual
 * height from `xl`.
 *
 * The fog belongs to the scene of the bare bulb. Thus it shows only on the
 * pages which the bulb lights (see `useIsLitPage`), and only from `xl`, where
 * the bulb shows. A viewer who prefers more contrast gets no fog.
 */
export const Fog = () => {
  const isLitPage = useIsLitPage();

  if (!isLitPage) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 hidden xl:block">
      <FogBank image={svgToStaticImageData(fogBack)} />
      <FogBank image={svgToStaticImageData(fogFront)} />
    </div>
  );
};

interface FogBankProps {
  /** One tile of the bank, which repeats to the side without a seam */
  readonly image: StaticImageData;
}

/**
 * One bank of fog. The outer box has the size of one tile and moves to the
 * right by its own width in each cycle of `--animate-seasonal-flow`, thus a
 * wider tile moves faster: the back bank moves 10 pixels per second and the
 * front bank 15 pixels per second. The inner box repeats the tile from the
 * left edge of the outer box to past the right edge of the viewport, thus it
 * covers the viewport at each point of the cycle. A viewer who prefers
 * reduced motion sees the fog stand still.
 *
 * The tile is a background which repeats, not an image, because one
 * background fills a viewport of each width, and images would need a fixed
 * number of copies. Like a lazy image, a background does not download while
 * its box does not display, thus small screens do not download the files.
 */
const FogBank = ({ image }: FogBankProps) => (
  <div
    className="absolute bottom-0 left-0 animate-seasonal-flow contrast-more:hidden"
    style={{ width: image.width, height: image.height }}
  >
    <div
      className="absolute inset-y-0 left-0 w-[calc(100%+100vw)] bg-repeat-x"
      style={{ backgroundImage: `url("${image.src}")` }}
    />
  </div>
);
