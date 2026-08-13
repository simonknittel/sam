import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const permissions: boolean[] = await Promise.all([
      authentication.authorize("analytics", "manage"),
    ]);

    const pages: Page[] = [];

    pages.push({
      title: "Benachrichtigungen",
      url: "/app/account/notifications",
    });

    if (permissions[0]) {
      pages.push({
        title: "Analytics",
        url: "/app/account/analytics",
      });
    }

    return pages;
  },
);
