import { getActiveSeasonalTheme } from "../queries/getActiveSeasonalTheme";

/**
 * The layer above the page which holds the moving decorations of the active
 * seasonal event, or nothing.
 *
 * The layer covers the viewport and clips everything which leaves it, thus a
 * decoration can never make the page scroll sideways. Its stacking level
 * keeps it above the header of a sub-app, which has the same level but comes
 * earlier in the document, and below the top bar, the modals, the flyout of
 * the mobile navigation and the onboarding tour. The moving decorations stay
 * off below the large breakpoint.
 */
export const SeasonalViewportLayer = async () => {
  const resolution = await getActiveSeasonalTheme();
  if (!resolution) return null;

  const { ViewportDecoration } = resolution.theme;

  return (
    <div
      aria-hidden
      className="hidden lg:block fixed inset-0 z-20 overflow-hidden pointer-events-none"
    >
      <ViewportDecoration />
    </div>
  );
};
