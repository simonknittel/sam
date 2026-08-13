import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

type Authentication = NonNullable<
  Exclude<Awaited<ReturnType<typeof authenticate>>, false>
>;

/**
 * Shared shell of the per-module `getNavigationItems` providers: resolves
 * the session and returns null for unauthenticated visitors, otherwise the
 * given static pages or the pages built by the callback (which typically
 * filters by permissions).
 */
export const createNavigationItems = (
  pages: Page[] | ((authentication: Authentication) => Promise<Page[]>),
) => {
  return async () => {
    const authentication = await authenticate();
    if (!authentication) return null;

    if (typeof pages === "function") return await pages(authentication);

    return pages;
  };
};
