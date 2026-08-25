import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const permissions: boolean[] = await Promise.all([
      authentication.authorize("analytics", "manage"),
    ]);

    const pages: Page[] = [];

    if (authentication.session.entity) {
      pages.push({
        title: "Profil",
        url: "/app/account/profile",
      });
    }

    pages.push({
      title: "Benachrichtigungen",
      url: "/app/account/notifications",
    });

    pages.push({
      title: "Sitzungen",
      url: "/app/account/sessions",
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
