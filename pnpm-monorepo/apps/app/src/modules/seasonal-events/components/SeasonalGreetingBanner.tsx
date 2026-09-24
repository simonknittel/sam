import { getInGameYear } from "@sam-monorepo/domain";
import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";
import { pickRandomWording } from "../utils/pickRandomWording";
import { SeasonalBannerClouds } from "./SeasonalBannerClouds";
import {
  SeasonalConfetti,
  SeasonalConfettiPlacement,
} from "./SeasonalConfetti";
import { SeasonalHeroOrnament } from "./SeasonalHeroOrnament";

/** Connects the surface with its heading, so that the banner has a name */
const TITLE_ELEMENT_ID = "seasonal-greeting-banner-title";

/**
 * The greeting of the active seasonal event, above the tiles of the
 * dashboard. It appears on the greeting days of the event only and it
 * disappears by itself; it is content and not a message of the moment, thus
 * it is no live region.
 *
 * The ornament is larger than the banner is high at its top and rises above
 * its upper edge. The surface is thus a layer of its own below the ornament:
 * the surface clips the confetti and the colour clouds at its round corners,
 * and the ornament stays outside of that clip. The ornament keeps inside the
 * left edge, because on a small viewport the banner reaches the edge of the
 * viewport, and a drawing beyond it would let the page scroll sideways.
 */
export const SeasonalGreetingBanner = async () => {
  const resolution = await getActiveSeasonalTheme();

  if (!resolution?.isGreetingDay) return null;

  const { theme, localDate } = resolution;

  const wording = pickRandomWording(theme.wordings);
  if (!wording) return null;

  const { title, body } = wording({
    inGameYear: getInGameYear(localDate.year),
  });

  return (
    <section
      data-seasonal-banner
      aria-labelledby={TITLE_ELEMENT_ID}
      className="relative text-text-primary"
    >
      {/* The surface isolates itself, thus the colour clouds and the confetti
      stay behind the greeting. The clouds lie below the confetti, which
      paints at `-z-10`. */}
      <div className="absolute inset-0 isolate overflow-hidden rounded-primary bg-secondary">
        <SeasonalBannerClouds
          surfaceClassName={theme.bannerSurfaceClassName}
          className="-z-20"
        />
        <SeasonalConfetti placement={SeasonalConfettiPlacement.Banner} />
      </div>

      <SeasonalHeroOrnament className="absolute -top-3 left-3 size-28" />

      <div className="relative flex flex-col gap-1 py-6 pr-6 pl-36">
        <h2
          id={TITLE_ELEMENT_ID}
          className="font-thin text-2xl font-mono uppercase"
        >
          {title}
        </h2>

        <p>{body}</p>
      </div>
    </section>
  );
};
