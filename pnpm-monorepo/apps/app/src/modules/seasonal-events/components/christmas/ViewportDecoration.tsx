import { ChristmasGift } from "./Gift";
import { ChristmasSnowflake } from "./Snowflake";
import { ChristmasSnowman } from "./Snowman";
import { ChristmasTree } from "./Tree";

/**
 * The flakes of the snowfall. The set is small and fixed, and every flake
 * has its own place, size, colour and delay, thus the fall looks natural
 * without a field of generated flakes.
 *
 * A delay is negative and covers the sixteen seconds of one fall, thus the
 * flakes already stand along the whole height of the page when the page
 * arrives, instead of falling together as one row. The delays do not grow
 * with the horizontal place of a flake, because the flakes would then stand
 * on one diagonal line.
 */
const SNOWFLAKE_CLASS_NAMES = [
  "left-[6%] size-2.5 text-white/60 [animation-delay:-9.1s]",
  "left-[14%] size-4 text-white/45 [animation-delay:-1.5s]",
  "left-[22%] size-3 text-white/70 [animation-delay:-13.9s]",
  "left-[31%] size-2 text-white/50 [animation-delay:-5.8s]",
  "left-[39%] size-3.5 text-white/40 [animation-delay:-0.4s]",
  "left-[48%] size-2.5 text-white/65 [animation-delay:-11.2s]",
  "left-[57%] size-4.5 text-white/35 [animation-delay:-3.3s]",
  "left-[66%] size-3 text-white/55 [animation-delay:-15.2s]",
  "left-[78%] size-2 text-white/70 [animation-delay:-7.6s]",
  "left-[90%] size-3.5 text-white/45 [animation-delay:-2.4s]",
];

/**
 * The gifts below the tree. They stand on the same line at the bottom edge
 * and go from the left of the trunk to the right of it, thus the tree looks
 * like it stands behind them. Every gift has its own size and its own paper,
 * thus the three do not look like one row of the same box.
 */
const GIFT_CLASS_NAMES = [
  "bottom-0 right-16 size-7 text-emerald-800",
  "bottom-0 right-9 size-8 text-sky-700",
  "bottom-0 right-1 size-9 text-rose-600",
];

/**
 * The snow above the page and the two still scenes in the bottom corners.
 *
 * The layer is the viewport and clips everything which leaves it, thus a
 * decoration can never make the page scroll sideways. The layer also paints
 * above the page, therefore the snowman and the tree stay in the two extreme
 * bottom corners, where a page keeps its margin and rarely puts a text. A
 * page which fills every pixel, for example a wide table, can still send a
 * line of text below a scene.
 *
 * The two scenes hold still. The page below them moves when the viewer
 * scrolls, and a decoration which moves as well makes that page difficult to
 * read. Only the star of the tree pulses.
 */
export const ChristmasViewportDecoration = () => (
  <>
    {SNOWFLAKE_CLASS_NAMES.map((className) => (
      <ChristmasSnowflake key={className} className={className} />
    ))}

    <ChristmasSnowman className="bottom-0 left-0 h-32 w-24 text-white/90" />

    <ChristmasTree className="bottom-1 right-0 h-32 w-24 text-emerald-700" />

    {GIFT_CLASS_NAMES.map((className) => (
      <ChristmasGift key={className} className={className} />
    ))}
  </>
);
