import { authenticate } from "@/modules/auth/server";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { getSeasonalDatePresets } from "@/modules/seasonal-events/queries/getSeasonalDatePresets";
import { getSeasonalOverrideState } from "@/modules/seasonal-events/queries/getSeasonalOverrideState";
import { AdminToolbarLoader } from "./AdminToolbarLoader";

/**
 * The tools of an admin, also while they assume a different user. Renders
 * nothing for every other user. The tools are in AdminToolbarClient.
 */
export const AdminToolbar = async () => {
  const authentication = await authenticate();
  if (!authentication || !isAdminBehindSession(authentication.session))
    return null;

  const { session } = authentication;

  const [adminModeActive, seasonalOverride] = await Promise.all([
    isAdminModeActive(session),
    getSeasonalOverrideState(),
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
    />
  );
};
