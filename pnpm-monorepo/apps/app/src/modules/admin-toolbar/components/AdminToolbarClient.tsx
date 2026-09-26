import { AdminModeTool } from "@/modules/auth/components/AdminModeTool";
import { AssumedUserBanner } from "@/modules/auth/components/AssumedUserBanner";
import { AssumeUserTool } from "@/modules/auth/components/AssumeUserTool";
import { SeasonalThemeTool } from "@/modules/seasonal-events/components/SeasonalThemeTool";
import type { SeasonalDatePreset } from "@/modules/seasonal-events/queries/getSeasonalDatePresets";
import type { SeasonalOverrideState } from "@/modules/seasonal-events/queries/getSeasonalOverrideState";
import { AdminToolbarSection } from "./AdminToolbarSection";
import { AdminToolbarShell } from "./AdminToolbarShell";

interface Props {
  /** Only set while the admin assumes a different user */
  readonly assumedUserLabel: string | null;
  readonly adminModeActive: boolean;
  readonly seasonalPresets: readonly SeasonalDatePreset[];
  readonly seasonalOverride: SeasonalOverrideState | null;
}

/**
 * The client part of the admin toolbar. Load it only through
 * AdminToolbarLoader. A new tool is one more section here.
 */
export const AdminToolbarClient = ({
  assumedUserLabel,
  adminModeActive,
  seasonalPresets,
  seasonalOverride,
}: Props) => {
  const activeOverrides = [
    ...(adminModeActive ? ["Admin mode"] : []),
    ...(seasonalOverride ? [seasonalOverride.label] : []),
  ];

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex max-w-[calc(100vw-1rem)] gap-2">
      {assumedUserLabel !== null && (
        <AssumedUserBanner assumedUserLabel={assumedUserLabel} />
      )}

      <AdminToolbarShell activeOverrides={activeOverrides}>
        {/* Admin mode has no effect while the admin assumes a user */}
        {assumedUserLabel === null && (
          <AdminToolbarSection title="Admin mode">
            <AdminModeTool enabled={adminModeActive} />
          </AdminToolbarSection>
        )}

        <AdminToolbarSection title="Assume user">
          <AssumeUserTool />
        </AdminToolbarSection>

        <AdminToolbarSection title="Seasonal theme">
          <SeasonalThemeTool
            presets={seasonalPresets}
            override={seasonalOverride}
          />
        </AdminToolbarSection>
      </AdminToolbarShell>
    </div>
  );
};
