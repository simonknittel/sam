"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * How long after a popstate event a pathname change still counts as a
 * back/forward navigation. React re-renders the route right after the event,
 * so the window only needs to cover that gap.
 */
const HISTORY_NAVIGATION_WINDOW_MILLISECONDS = 500;

/**
 * Scrolls the window back to the top when navigating between routes that
 * share a persistent layout. Next.js skips its own scroll reset there: while
 * the new page's suspense fallback shows, the document briefly shrinks, the
 * browser clamps the scroll near the top, and Next.js therefore considers
 * the new content already visible — but once the page has streamed in, the
 * browser restores the old scroll offset and the viewer lands mid-page.
 *
 * Browser back/forward is left alone so its native scroll restoration keeps
 * working.
 */
export const ScrollToTopOnNavigation = () => {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const lastPopStateTimestamp = useRef(0);

  useEffect(() => {
    const handlePopState = () => {
      lastPopStateTimestamp.current = Date.now();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const isHistoryNavigation =
      Date.now() - lastPopStateTimestamp.current <
      HISTORY_NAVIGATION_WINDOW_MILLISECONDS;
    if (isHistoryNavigation) return;

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
