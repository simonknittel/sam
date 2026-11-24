import {
  GreetingBanner,
  GreetingBannerMarker,
} from "@/modules/dashboard/components/GreetingBanner";
import { pickRandomWording } from "@/modules/dashboard/utils/greetingWordings";
import { getInGameYear } from "@sam-monorepo/domain";
import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

export const SeasonalGreetingBanner = async () => {
  const resolution = await getActiveSeasonalTheme();

  if (!resolution?.isGreetingDay) return null;

  const { theme, localDate } = resolution;

  const wording = pickRandomWording(theme.wordings, {
    inGameYear: getInGameYear(localDate.year),
  });
  if (!wording) return null;

  const { HeroOrnament } = theme;

  return (
    <GreetingBanner
      marker={GreetingBannerMarker.Seasonal}
      surfaceClassName={theme.bannerSurfaceClassName}
      hasConfetti={theme.hasConfetti}
      ornament={<HeroOrnament className="size-full" />}
      title={wording.title}
      body={wording.body}
    />
  );
};
