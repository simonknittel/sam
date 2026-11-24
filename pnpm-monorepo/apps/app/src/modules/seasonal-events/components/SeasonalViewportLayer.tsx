import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The layer clips everything which leaves the viewport, thus a decoration can
 * never make the page scroll sideways. Its stacking level keeps it above the
 * header of a sub-app, which has the same level but comes earlier in the
 * document, and below the top bar, the modals, the flyout of the mobile
 * navigation and the onboarding tour.
 */
export const SeasonalViewportLayer = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { ViewportDecoration } = resolution.theme;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 hidden overflow-hidden lg:block"
    >
      <ViewportDecoration />
    </div>
  );
};
