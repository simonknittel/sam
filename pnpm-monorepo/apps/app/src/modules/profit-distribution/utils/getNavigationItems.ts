import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const permissions = await Promise.all([
      authentication.authorize("profitDistributionCycle", "read"),
      authentication.authorize("profitDistributionCycle", "manage"),
    ]);

    const pages: Page[] = [];

    if (permissions[0] || permissions[1]) {
      pages.push({
        title: "Alle Zeiträume",
        url: "/app/sincome",
      });
    }

    return pages;
  },
);
