import { usePathname } from "next/navigation";

/**
 * On every other page the drawings of the layer would lie over the work of the
 * viewer, thus those pages stay bright and clear.
 */
const LIT_PAGE_PATHNAMES = new Set(["/", "/app/dashboard"]);

/**
 * The layer above the viewport belongs to the layout, thus it stays through a
 * navigation and learns the page only from the path.
 */
export const useIsLitPage = () => LIT_PAGE_PATHNAMES.has(usePathname());
