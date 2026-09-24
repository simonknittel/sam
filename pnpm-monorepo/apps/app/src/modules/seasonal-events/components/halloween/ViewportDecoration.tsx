import { BareBulb } from "./BareBulb";
import { BrokenLight } from "./BrokenLight";
import { ViewportCornerWeb } from "./CornerWeb";
import { Fog } from "./Fog";
import { Ghost } from "./Ghost";

/**
 * The drawings of the layer above the page: the web in the corner of a page
 * without the top bar, the fog along the lower edge, the light which fails
 * now and then, and the ghost which drifts across the viewport now and then.
 * The layer gives no box, thus each drawing places itself.
 *
 * The web and the fog come before the light, thus the light makes them
 * darker together with the page: the vignette lies on them, and they go dark
 * when the light fails. The bulb and the ghost come after the light, thus
 * the light never makes them darker.
 */
export const HalloweenViewportDecoration = () => (
  <>
    <ViewportCornerWeb />
    <Fog />
    <BrokenLight />
    <BareBulb />
    <Ghost />
  </>
);
