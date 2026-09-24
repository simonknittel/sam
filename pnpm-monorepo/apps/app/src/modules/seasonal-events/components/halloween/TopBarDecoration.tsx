import { BareBulbCord } from "./BareBulb";
import { BloodTrail } from "./BloodTrail";
import { TopBarCornerWeb } from "./CornerWeb";
import { HangingSpider } from "./HangingSpider";

/**
 * The web in the top left corner, the blood which seeps out of the lower edge
 * of the top bar, the spider which hangs below the bar, and the part of the
 * cord of the bare bulb which runs through the bar.
 *
 * The box of the slot is the bar itself, thus every drawing places itself.
 * The file of each drawing gives the part of the page it covers and the
 * controls it keeps clear of. The slot lets every pointer through, thus each
 * control under a drawing stays usable.
 */
export const HalloweenTopBarDecoration = () => (
  <>
    <TopBarCornerWeb />
    <BareBulbCord />
    <BloodTrail />
    <HangingSpider />
  </>
);
