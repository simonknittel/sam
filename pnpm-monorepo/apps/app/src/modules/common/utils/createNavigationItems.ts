import { requireAuthenticationPage } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

type Authentication = Awaited<ReturnType<typeof requireAuthenticationPage>>;

/** Runs the gate of the pages, because the layouts call it. */
export const createNavigationItems = (
  pages: Page[] | ((authentication: Authentication) => Promise<Page[]>),
) => {
  return async () => {
    const authentication = await requireAuthenticationPage();

    if (typeof pages === "function") return await pages(authentication);

    return pages;
  };
};
