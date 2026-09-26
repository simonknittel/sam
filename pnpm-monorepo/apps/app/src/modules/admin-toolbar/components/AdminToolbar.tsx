import { AdminModeTool } from "@/modules/auth/components/AdminModeTool";
import { AssumedUserBanner } from "@/modules/auth/components/AssumedUserBanner";
import { AssumeUserTool } from "@/modules/auth/components/AssumeUserTool";
import { authenticate } from "@/modules/auth/server";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { isAdminModeActive } from "@/modules/auth/utils/isAdminModeActive";
import { SeasonalThemeTool } from "@/modules/seasonal-events/components/SeasonalThemeTool";
import { getSeasonalDatePresets } from "@/modules/seasonal-events/queries/getSeasonalDatePresets";
import { getSeasonalOverrideState } from "@/modules/seasonal-events/queries/getSeasonalOverrideState";
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

  const { session } = authentication;

  const [adminModeActive, seasonalOverride] = await Promise.all([
    isAdminModeActive(session),
    getSeasonalOverrideState(),
  ]);

  const activeOverrides = [
    ...(adminModeActive ? ["Admin mode"] : []),
    ...(seasonalOverride ? [seasonalOverride.label] : []),
  ];

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex max-w-[calc(100vw-1rem)] gap-2">
      {session.assumedByAdminId && (
        <AssumedUserBanner
          assumedUserLabel={
            session.user.name ?? session.user.email ?? session.user.id
          }
        />
      )}

      <AdminToolbarShell activeOverrides={activeOverrides}>
        {/* Admin mode has no effect while the admin assumes a user */}
        {!session.assumedByAdminId && (
          <AdminToolbarSection title="Admin mode">
            <AdminModeTool enabled={adminModeActive} />
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
