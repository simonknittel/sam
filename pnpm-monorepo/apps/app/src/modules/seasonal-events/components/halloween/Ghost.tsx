import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import ghost from "../../assets/halloween/ghost.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * The height lies on the outer box, the drift on the middle box and the swing
 * on the inner box.
 *
 * The boxes stand one width to the left of the viewport, where the layer clips
 * them. Without the drift, the ghost thus stays out of sight instead of
 * standing on the page for ever.
 */
export const Ghost = () => (
  <div className="absolute top-0 -left-28 animate-seasonal-drift-height">
    <div className="animate-seasonal-drift">
      <div className="h-32 w-28 origin-top animate-seasonal-sway">
        <SeasonalImage
          src={svgToStaticImageData(ghost)}
          className="size-full"
        />
      </div>
    </div>
  </div>
);
