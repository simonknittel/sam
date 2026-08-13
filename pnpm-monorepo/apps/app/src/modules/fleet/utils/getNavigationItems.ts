import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const permissions = await Promise.all([
      authentication.authorize("orgFleet", "read"),
      authentication.authorize("ship", "manage"),
      authentication.authorize("manufacturersSeriesAndVariants", "manage"),
      authentication.authorize("otherShips", "read"),
    ]);

    const pages: Page[] = [];

    if (permissions[0]) {
      pages.push({
        title: "Organisation",
        url: "/app/fleet/org",
      });
    }

    if (permissions[1]) {
      pages.push({
        title: "Meine Schiffe",
        url: "/app/fleet/my-ships",
      });
    }

    if (permissions[3]) {
      pages.push({
        title: "Änderungen",
        url: "/app/fleet/changes",
      });
    }

    if (permissions[2]) {
      pages.push({
        title: "Einstellungen",
        url: "/app/fleet/settings/manufacturer",
      });
    }

    return pages;
  },
);
