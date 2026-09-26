import { AdminModeTool } from "@/modules/auth/components/AdminModeTool";
import { AssumedUserBanner } from "@/modules/auth/components/AssumedUserBanner";
import { AssumeUserTool } from "@/modules/auth/components/AssumeUserTool";
import { authenticate } from "@/modules/auth/server";
import { getAssumedUserLabel } from "@/modules/auth/utils/getAssumedUserLabel";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { isAdminModeCookieSet } from "@/modules/auth/utils/isAdminModeCookieSet";
import { SeasonalThemeTool } from "@/modules/seasonal-events/components/SeasonalThemeTool";
import { getSeasonalOverrideState } from "@/modules/seasonal-events/queries/getSeasonalOverrideState";
import { getSeasonalDatePresets } from "@/modules/seasonal-events/utils/getSeasonalDatePresets";
import { AdminToolbarSection } from "./AdminToolbarSection";
import { AdminToolbarShell } from "./AdminToolbarShell";

/**
 * The tools of an admin, also while they assume a different user. Renders
 * nothing for every other user. A new tool is one more section here.
 */
export const AdminToolbar = async () => {
  const authentication = await authenticate();
  if (!authentication || !isAdminBehindSession(authentication.session))
    return null;

  const [adminModeEnabled, seasonalOverride] = await Promise.all([
    isAdminModeCookieSet(),
    getSeasonalOverrideState(),
  ]);

  const assumedUserLabel = getAssumedUserLabel(authentication.session);

  const activeOverrides = [
    ...(adminModeEnabled ? ["Admin mode"] : []),
    ...(seasonalOverride
      ? [
          `${seasonalOverride.eventTitle ?? "No theme"} ${seasonalOverride.date}`,
        ]
      : []),
  ];

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex max-w-[calc(100vw-1rem)] gap-2">
      {assumedUserLabel && (
        <AssumedUserBanner assumedUserLabel={assumedUserLabel} />
      )}

      <AdminToolbarShell activeOverrides={activeOverrides}>
        {/* Assuming a user clears admin mode, and the permissions of the
            assumed user must apply */}
        {!assumedUserLabel && (
          <AdminToolbarSection title="Admin mode">
            <AdminModeTool enabled={adminModeEnabled} />
          </AdminToolbarSection>
        )}

        <AdminToolbarSection title="Assume user">
          <AssumeUserTool />
        </AdminToolbarSection>

        <AdminToolbarSection title="Seasonal theme">
          <SeasonalThemeTool
            presets={getSeasonalDatePresets()}
            override={seasonalOverride}
          />
        </AdminToolbarSection>
      </AdminToolbarShell>
    </div>
  );
};
