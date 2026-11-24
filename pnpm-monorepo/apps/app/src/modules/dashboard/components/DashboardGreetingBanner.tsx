import { requireAuthenticationPage } from "@/modules/auth/server";
import { BirthdayGreetingBanner } from "@/modules/citizen/components/BirthdayGreetingBanner";
import { WelcomeGreetingBanner } from "@/modules/onboarding/components/WelcomeGreetingBanner";
import { isWelcomeDay } from "@/modules/onboarding/queries/isWelcomeDay";
import { SeasonalGreetingBanner } from "@/modules/seasonal-events/components/SeasonalGreetingBanner";
import { getGreetingBannerPreview } from "../queries/getGreetingBannerPreview";
import { GreetingBannerPreview } from "../utils/GreetingBannerPreview";

/**
 * The occasions share one place, thus only the first one of the order below
 * shows. The other seasonal decorations stay also when a welcome or a birthday
 * banner replaces the seasonal banner.
 */
export const DashboardGreetingBanner = async () => {
  const [authentication, preview] = await Promise.all([
    requireAuthenticationPage(),
    getGreetingBannerPreview(),
  ]);
  const { entity } = authentication.session;
  const context = { handle: entity?.handle ?? null };

  switch (preview) {
    case GreetingBannerPreview.Welcome:
      return <WelcomeGreetingBanner context={context} />;

    case GreetingBannerPreview.Birthday:
      return <BirthdayGreetingBanner context={context} />;

    case null:
      break;

    default:
      throw new Error(
        `Unknown greeting banner preview: ${preview satisfies never}`,
      );
  }

  if (entity && (await isWelcomeDay(entity.id)))
    return <WelcomeGreetingBanner context={context} />;

  if (entity?.hasBirthdayToday)
    return <BirthdayGreetingBanner context={context} />;

  return <SeasonalGreetingBanner />;
};
