import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import cornerWebLarge from "../../assets/halloween/corner-web-large.svg";
import cornerWeb from "../../assets/halloween/corner-web.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * The web in the top left corner of a page of the app. The box starts 8
 * pixels before the top bar on both axes, which is the width of the black
 * frame around the bar, thus the web holds on the edges of the viewport. The
 * web covers x 0 to 100 and y 0 to 108 of the page.
 *
 * Along the top edge, the web runs above the label "Apps" and stops before
 * the dot of the button. Down the left edge, it hangs into the header of the
 * sub-app to the lower edge of the header, where the header is empty to the
 * left of the title. The web keeps 6 pixels clear of the label and 9 pixels
 * clear of the title. The icon of the button (x 32 to 52, y 22 to 42) lies
 * below the faint outer rows of the web.
 */
export const TopBarCornerWeb = () => (
  <div className="absolute -left-2 -top-2 w-25 h-27">
    <SeasonalImage
      src={svgToStaticImageData(cornerWeb)}
      className="size-full"
    />
  </div>
);

/**
 * The web in the top left corner of a page without the top bar, which is the
 * login page. There the corner is empty, thus this web is larger.
 *
 * The pages of the app also have the layer of this web, but there the top
 * bar covers the corner and holds `TopBarCornerWeb`. Thus a CSS rule hides
 * this web on each page which has the slot of the top bar, and each page
 * shows one web. The rule needs no data from the page around the layer, and
 * the browser does not download a lazy image in a hidden box.
 */
export const ViewportCornerWeb = () => (
  <div className="absolute left-0 top-0 w-44 h-50 [:root:has([data-seasonal-top-bar])_&]:hidden">
    <SeasonalImage
      src={svgToStaticImageData(cornerWebLarge)}
      className="size-full"
    />
  </div>
);
