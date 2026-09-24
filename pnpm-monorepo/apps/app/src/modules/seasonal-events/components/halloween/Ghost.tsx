import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import ghost from "../../assets/halloween/ghost.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * A ghost which raises its arms for a "boo!" and drifts across the viewport
 * now and then, each time at another height. It rocks while it travels. The
 * height lies on the outer box, the drift on the middle box and the swing on
 * the inner box.
 *
 * The boxes stand one width to the left of the viewport, where the layer
 * clips them, and the drift brings the ghost in from there. A viewer who
 * prefers reduced motion gets no drift, and the ghost then stays out of sight
 * instead of standing on the page for ever.
 *
 * The ghost is translucent, thus the text below it stays legible while it
 * passes.
 */
export const Ghost = () => (
  <div className="absolute -left-28 top-0 animate-seasonal-drift-height">
    <div className="animate-seasonal-drift">
      <div className="w-28 h-32 origin-top animate-seasonal-sway">
        <SeasonalImage
          src={svgToStaticImageData(ghost)}
          className="size-full"
        />
      </div>
    </div>
  </div>
);
