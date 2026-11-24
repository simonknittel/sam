import { authenticate } from "@/modules/auth/server";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { getGreetingBannerPreview } from "@/modules/dashboard/queries/getGreetingBannerPreview";
import { getSeasonalDatePresets } from "@/modules/seasonal-events/queries/getSeasonalDatePresets";
import { getSeasonalOverrideState } from "@/modules/seasonal-events/queries/getSeasonalOverrideState";
import { AdminToolbarLoader } from "./AdminToolbarLoader";

export const AdminToolbar = async () => {
  const authentication = await authenticate();
  if (!authentication || !isAdminBehindSession(authentication.session))
    return null;

  const { session } = authentication;

  const [adminModeActive, seasonalOverride, greetingBannerPreview] =
    await Promise.all([
      isAdminModeActive(session),
      getSeasonalOverrideState(),
      getGreetingBannerPreview(),
    ]);

  return (
    <AdminToolbarLoader
      assumedUserLabel={
        session.assumedByAdminId
          ? (session.user.name ?? session.user.email ?? session.user.id)
          : null
      }
      adminModeActive={adminModeActive}
      seasonalPresets={getSeasonalDatePresets()}
      seasonalOverride={seasonalOverride}
      greetingBannerPreview={greetingBannerPreview}
    />
  );
};
