import { BareBulbCord } from "./BareBulb";
import { BloodTrail } from "./BloodTrail";
import { TopBarCornerWeb } from "./CornerWeb";
import { HangingSpider } from "./HangingSpider";

/**
 * The file of each drawing gives the part of the page it covers and the
 * controls it keeps clear of.
 */
export const HalloweenTopBarDecoration = () => (
  <>
    <TopBarCornerWeb />
    <BareBulbCord />
    <BloodTrail />
    <HangingSpider />
  </>
);
