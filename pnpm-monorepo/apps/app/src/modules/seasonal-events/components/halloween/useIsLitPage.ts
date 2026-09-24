import { usePathname } from "next/navigation";

/**
 * The pages which the bulb lights and where the fog drifts: the login page
 * and the dashboard. On every other page the drawings of the layer would lie
 * over the work of the viewer, thus those pages stay bright and clear.
 */
const LIT_PAGE_PATHNAMES = new Set(["/", "/app/dashboard"]);

/**
 * Whether the viewer looks at a page which the bulb lights. The layer above
 * the viewport belongs to the layout, thus it stays through a navigation and
 * learns the page only from the path.
 */
export const useIsLitPage = () => LIT_PAGE_PATHNAMES.has(usePathname());
