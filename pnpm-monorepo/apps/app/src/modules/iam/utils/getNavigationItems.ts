import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const permissions = await Promise.all([
      authentication.authorize("role", "manage"),
      authentication.authorize("user", "read"),
    ]);

    const pages: Page[] = [];

    if (permissions[0]) {
      pages.push(
        {
          title: "Rollen",
          url: "/app/iam/roles",
        },
        {
          title: "Berechtigungsmatrix",
          url: "/app/iam/permission-matrix",
        },
      );
    }

    if (permissions[1]) {
      pages.push({
        title: "Benutzer",
        url: "/app/iam/users",
      });
    }

    return pages;
  },
);
