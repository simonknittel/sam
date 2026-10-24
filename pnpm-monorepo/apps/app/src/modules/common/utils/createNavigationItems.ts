import { requireAuthenticationPage } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

type Authentication = Awaited<ReturnType<typeof requireAuthenticationPage>>;

/**
 * Shared shell of the per-module `getNavigationItems` providers: runs the
 * gate of the pages (the layouts call it), then gives the static pages or the
 * pages built by the callback (which typically filters by permissions).
 */
export const createNavigationItems = (
  pages: Page[] | ((authentication: Authentication) => Promise<Page[]>),
) => {
  return async () => {
    const authentication = await requireAuthenticationPage();

    if (typeof pages === "function") return await pages(authentication);

    return pages;
  };
};
