import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import jackOLantern from "../../assets/halloween/jack-o-lantern.svg";
import type { SeasonalDecorationProps } from "../../utils/types";
import { SeasonalImage } from "../SeasonalImage";

/**
 * The jack-o'-lantern of the greeting banner: a round, friendly pumpkin with
 * a candle inside. The caller gives the box; the drawing fills it.
 *
 * The drawing is a static file, thus the browser caches it once and the page
 * does not carry its markup. `SeasonalImage` tells why the file is not
 * optimized.
 */
export const HalloweenHeroOrnament = ({
  className,
}: SeasonalDecorationProps) => (
  <SeasonalImage
    src={svgToStaticImageData(jackOLantern)}
    className={className}
  />
);
