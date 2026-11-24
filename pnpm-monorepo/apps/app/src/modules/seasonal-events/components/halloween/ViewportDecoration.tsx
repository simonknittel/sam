import { BareBulb } from "./BareBulb";
import { BrokenLight } from "./BrokenLight";
import { ViewportCornerWeb } from "./CornerWeb";
import { Fog } from "./Fog";
import { Ghost } from "./Ghost";

/**
 * The web and the fog come before the light, thus the light makes them darker
 * together with the page: the vignette lies on them, and they go dark when the
 * light fails. The bulb and the ghost come after the light, thus the light
 * never makes them darker.
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
