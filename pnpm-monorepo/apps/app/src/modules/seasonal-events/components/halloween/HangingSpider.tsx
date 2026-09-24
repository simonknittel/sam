import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import hangingSpider from "../../assets/halloween/hanging-spider.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * A spider which has come down on its thread below the top bar to have a
 * look, and which swings around the top end of the thread — see
 * `--animate-seasonal-sway` in the stylesheet, which stops the motion for a
 * viewer who prefers reduced motion. The spider then hangs straight.
 *
 * The thread starts at the top centre of the drawing, which is also the point
 * the swing turns around.
 *
 * The spider covers x W − 184 to W − 152 (W is the viewport width) and
 * y 56 to 120 of the page, and keeps 31 pixels from the call-to-action button
 * of a sub-app. It shows from `xl` only: at a viewport width of 1024 the free
 * stretch under the bar is only 171 pixels wide and belongs to the blood
 * trail.
 */
export const HangingSpider = () => (
  <div className="absolute top-full right-36 hidden xl:block w-8 h-16 origin-top animate-seasonal-sway">
    <SeasonalImage
      src={svgToStaticImageData(hangingSpider)}
      className="size-full"
    />
  </div>
);
