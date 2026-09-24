import { ChristmasLightBulb } from "./LightBulb";

/**
 * The lamps of the string of lights. A lamp sits on a low point of the wire:
 * the wire has one low point every twentieth of its width, thus the
 * horizontal place of a lamp holds at every width of the bar. The four
 * colours repeat, and every lamp has a delay of its own, thus the string
 * does not pulse as one lamp. The delays are negative, thus the string
 * already pulses when the page arrives.
 */
const LIGHT_BULB_CLASS_NAMES = [
  "left-[2.5%] text-red-400 [animation-delay:-0.2s]",
  "left-[7.5%] text-emerald-300 [animation-delay:-1.4s]",
  "left-[12.5%] text-amber-300 [animation-delay:-0.7s]",
  "left-[17.5%] text-sky-300 [animation-delay:-2.1s]",
  "left-[22.5%] text-red-400 [animation-delay:-1.1s]",
  "left-[27.5%] text-emerald-300 [animation-delay:-0.4s]",
  "left-[32.5%] text-amber-300 [animation-delay:-1.8s]",
  "left-[37.5%] text-sky-300 [animation-delay:-0.9s]",
  "left-[42.5%] text-red-400 [animation-delay:-2.3s]",
  "left-[47.5%] text-emerald-300 [animation-delay:-1.6s]",
  "left-[52.5%] text-amber-300 [animation-delay:-0.3s]",
  "left-[57.5%] text-sky-300 [animation-delay:-1.9s]",
  "left-[62.5%] text-red-400 [animation-delay:-1.2s]",
  "left-[67.5%] text-emerald-300 [animation-delay:-2.4s]",
  "left-[72.5%] text-amber-300 [animation-delay:-0.6s]",
  "left-[77.5%] text-sky-300 [animation-delay:-1.5s]",
  "left-[82.5%] text-red-400 [animation-delay:-2s]",
  "left-[87.5%] text-emerald-300 [animation-delay:-0.8s]",
  "left-[92.5%] text-amber-300 [animation-delay:-1.7s]",
  "left-[97.5%] text-sky-300 [animation-delay:-1.3s]",
];

/**
 * The string of lights along the top bar.
 *
 * The box of the slot is the bar itself, thus every part positions itself
 * with a negative offset from the top of that box. The wire and the lamps
 * hang in the sixteen pixels above the controls of the bar: eight pixels of
 * the black band above the bar, and eight pixels of the bar which hold no
 * button, no label and no icon. The lowest point of a lamp therefore stays
 * one pixel above the top edge of the "Neu" button, of the search field and
 * of the picture of the account, at every width of the bar.
 *
 * The wire follows the width of the bar and gets
 * `preserveAspectRatio="none"`: a wire may become longer or shorter and does
 * not show the stretch. It needs `w-full` next to its offsets, because an
 * SVG which is positioned absolutely otherwise keeps the width of its own
 * `viewBox` and stops in the middle of a wide bar. A lamp must stay round
 * and is therefore an element of its own with a fixed size.
 *
 * All colours come from `currentColor`, which the class of each part sets.
 */
export const ChristmasTopBarDecoration = () => (
  <>
    <svg
      aria-hidden
      viewBox="0 0 1000 8"
      preserveAspectRatio="none"
      className="absolute -top-2 left-0 h-2 w-full text-neutral-400/75"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
    >
      <path d="M0 1.4Q25 5.6 50 1.4Q75 5.6 100 1.4Q125 5.6 150 1.4Q175 5.6 200 1.4Q225 5.6 250 1.4Q275 5.6 300 1.4Q325 5.6 350 1.4Q375 5.6 400 1.4Q425 5.6 450 1.4Q475 5.6 500 1.4Q525 5.6 550 1.4Q575 5.6 600 1.4Q625 5.6 650 1.4Q675 5.6 700 1.4Q725 5.6 750 1.4Q775 5.6 800 1.4Q825 5.6 850 1.4Q875 5.6 900 1.4Q925 5.6 950 1.4Q975 5.6 1000 1.4" />
    </svg>

    {LIGHT_BULB_CLASS_NAMES.map((className) => (
      <ChristmasLightBulb key={className} className={className} />
    ))}
  </>
);
