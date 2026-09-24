import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import bloodDrop from "../../assets/halloween/blood-drop.svg";
import bloodTrail from "../../assets/halloween/blood-trail.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * Blood which seeps out along the lower edge of the top bar, and a drop which
 * forms under the longest drip, falls a short distance and fades — see
 * `--animate-seasonal-drip` in the stylesheet, which stops the motion for a
 * viewer who prefers reduced motion. At rest the drop is invisible, thus that
 * viewer sees the still trail only.
 *
 * The trail covers y 56 to 104 of the page, over the header of a sub-app,
 * which ends at y 105. The longest navigation of a sub-app (SpyNet in admin
 * mode) ends at x 732, and the call-to-action button of a sub-app starts 121
 * pixels before the right edge of the viewport.
 *
 * From `xl` the trail hangs to the right of the search field of the top
 * bar, from W / 2 + 272 to W / 2 + 400 (W is the viewport width), and the
 * bare bulb hangs to the left of the search field (`bareBulbPlace` gives
 * its place). At a viewport width of 1280, 56 pixels stay free to the spider
 * and 119 pixels to the call-to-action button. Below `xl` the spider does not
 * show, and there is no room to the right: the trail covers x 760 to 888,
 * and at a viewport width of 1024 15 pixels stay free to the
 * call-to-action button (x 903).
 *
 * The bead of the longest drip has its centre 35 pixels from the left edge of
 * the trail and its lowest point 40 pixels below the bar. The box of the drop
 * (6 pixels wide) thus starts 32 pixels from the left and 38 pixels from the
 * top, and the narrow top of the drop lies in the bead. The drop stretches
 * out of that point, therefore it turns around its top edge.
 */
export const BloodTrail = () => (
  <div className="absolute top-full left-[47rem] xl:left-[calc(50%+272px)] w-32 h-12">
    <SeasonalImage
      src={svgToStaticImageData(bloodTrail)}
      className="absolute inset-0 size-full"
    />

    <div className="absolute left-8 top-9.5 w-1.5 h-2 origin-top opacity-0 animate-seasonal-drip">
      <SeasonalImage
        src={svgToStaticImageData(bloodDrop)}
        className="size-full"
      />
    </div>
  </div>
);
