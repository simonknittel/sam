import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import clsx from "clsx";
import bareBulbCord from "../../assets/halloween/bare-bulb-cord.svg";
import bareBulbOff from "../../assets/halloween/bare-bulb-off.svg";
import bareBulb from "../../assets/halloween/bare-bulb.svg";
import { SeasonalImage } from "../SeasonalImage";
import { BARE_BULB_PLACE_CLASS_NAME } from "./bareBulbPlace";

/**
 * The bare bulb which is the broken light of the page. It hangs on its cord
 * from the top edge of the viewport. On a page of the app the top bar covers
 * the first 56 pixels of the cord, thus `BareBulbCord` draws that part again
 * over the bar. The glass hangs in the header of a sub-app (y 74 to 93).
 *
 * The unlit bulb lies on the lit bulb and has the motion of the dark sheet,
 * thus the bulb goes dark exactly when the page goes dark. At rest and for a
 * viewer who prefers reduced motion, the unlit bulb is invisible and the bulb
 * burns.
 */
export const BareBulb = () => (
  <div className={clsx("absolute top-0 h-25", BARE_BULB_PLACE_CLASS_NAME)}>
    <SeasonalImage
      src={svgToStaticImageData(bareBulb)}
      className="absolute inset-0 size-full"
    />

    <div className="absolute inset-0 opacity-0 animate-seasonal-power-flicker">
      <SeasonalImage
        src={svgToStaticImageData(bareBulbOff)}
        className="size-full"
      />
    </div>
  </div>
);

/**
 * The part of the cord of the bare bulb which the top bar covers, from the
 * top edge of the viewport to the lower edge of the bar. The box of the top
 * bar starts 8 pixels below the top edge, thus the part starts 8 pixels
 * above its box. The drawing repeats the first 56 pixels of the cord of the
 * bulb, thus the two parts join without a seam.
 */
export const BareBulbCord = () => (
  <div className={clsx("absolute -top-2 h-14", BARE_BULB_PLACE_CLASS_NAME)}>
    <SeasonalImage
      src={svgToStaticImageData(bareBulbCord)}
      className="size-full"
    />
  </div>
);
