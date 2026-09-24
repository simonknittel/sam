import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import candleFlames from "../../assets/halloween/candle-flames.svg";
import candles from "../../assets/halloween/candles.svg";
import waxDrips from "../../assets/halloween/wax-drips.svg";
import { SeasonalImage } from "../SeasonalImage";

/**
 * Two lit candles which stand on the upper edge of the SpyNet search tile,
 * near its right end. Their wax pools on the edge and runs down the face of
 * the tile.
 *
 * The three drawings share one box: it starts 56 pixels above the edge of
 * the tile and goes 48 pixels down into the tile, thus the edge lies at
 * y 56 in each drawing. The long drips run down only where the search field
 * never shows text or an icon: between the end of the input and the clear
 * button, and to the right of the clear button. The other drips end above
 * the text.
 *
 * The flames are a separate drawing on top, thus only the flames and their
 * light on the tile flicker. A viewer who prefers reduced motion sees the
 * flames fully lit.
 */
export const HalloweenSpynetSearchTileDecoration = () => (
  <div className="absolute -top-14 right-0 w-16 h-26">
    <SeasonalImage
      src={svgToStaticImageData(candles)}
      className="absolute inset-0 size-full"
    />

    <SeasonalImage
      src={svgToStaticImageData(waxDrips)}
      className="absolute inset-0 size-full"
    />

    <div className="absolute inset-0 animate-seasonal-flicker [animation-delay:-1.1s]">
      <SeasonalImage
        src={svgToStaticImageData(candleFlames)}
        className="size-full"
      />
    </div>
  </div>
);
