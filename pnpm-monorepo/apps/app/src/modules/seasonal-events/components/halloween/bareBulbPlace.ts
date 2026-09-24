/**
 * The place of the bulb along the width of the page, shared by the bulb and
 * the part of its cord in the top bar.
 *
 * The bulb hangs to the left of the search field of the top bar, thus its
 * cord runs through the bar where the bar is empty, and the blood trail
 * hangs to the right of the search field (`BloodTrail` gives its place). Its
 * centre is at W / 2 - 220 (W is the viewport width): the search field
 * starts at W / 2 - 184, thus the cord keeps 36 pixels from it, and the box
 * of 24 pixels starts at W / 2 - 232. The top bar is centred in the viewport
 * with a frame of 8 pixels, thus the same position in the box of the bar
 * gives the same place on the page.
 *
 * Below the bar, the glass hangs in the header of a sub-app, where the
 * navigation of the sub-app starts at the left. On a viewport narrower than
 * about 1900 pixels the glass thus lies over a link of that navigation on
 * some pages. Simon chose this place over a place which changes with the
 * width of the viewport; the bulb lets every pointer through, thus the link
 * stays usable. The bulb shows from `xl` only, like the failing light which
 * it explains.
 */
export const BARE_BULB_PLACE_CLASS_NAME =
  "left-[calc(50%-232px)] hidden xl:block w-6";

/**
 * The centre of the glass of the bulb as a position in the viewport, where
 * `BrokenLight` centres the light of the page: the centre of the box of the
 * bulb (W / 2 - 220) and 84 pixels below the top edge of the viewport, in
 * the middle of the glass (y 74 to 93).
 */
export const BARE_BULB_GLASS_CENTRE = "calc(50% - 220px) 84px";
