import { requireAuthenticationPage } from "@/modules/auth/server";
import { BirthdayGreetingBanner } from "@/modules/citizen/components/BirthdayGreetingBanner";
import { WelcomeGreetingBanner } from "@/modules/onboarding/components/WelcomeGreetingBanner";
import { isWelcomeDay } from "@/modules/onboarding/queries/isWelcomeDay";
import { SeasonalGreetingBanner } from "@/modules/seasonal-events/components/SeasonalGreetingBanner";
import { getGreetingBannerPreview } from "../queries/getGreetingBannerPreview";
import { GreetingBannerPreview } from "../utils/GreetingBannerPreview";

/**
 * The one greeting banner of the dashboard. The occasions share one place,
 * thus only the first one of this order shows: the welcome on the first day
 * of a new member, the birthday of the viewer, the greeting day of the
 * active seasonal event. The seasonal banner renders nothing outside the
 * greeting days of its event, thus the dashboard usually has no banner.
 *
 * A preview of the admin toolbar replaces the order and shows the occasion
 * it names, also on a day without that occasion.
 *
 * A welcome or a birthday banner replaces only the seasonal banner: the
 * other seasonal decorations stay.
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
