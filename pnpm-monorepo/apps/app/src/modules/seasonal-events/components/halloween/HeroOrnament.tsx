import { svgToStaticImageData } from "@/modules/common/utils/svgToStaticImageData";
import jackOLantern from "../../assets/halloween/jack-o-lantern.svg";
import type { SeasonalDecorationProps } from "../../utils/types";
import { SeasonalImage } from "../SeasonalImage";

export const HalloweenHeroOrnament = ({
  className,
}: SeasonalDecorationProps) => (
  <SeasonalImage
    src={svgToStaticImageData(jackOLantern)}
    className={className}
  />
);
