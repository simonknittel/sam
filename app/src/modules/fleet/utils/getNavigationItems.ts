import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const permissions = await Promise.all([
    authentication.authorize("orgFleet", "read"),
    authentication.authorize("ship", "manage"),
    authentication.authorize("manufacturersSeriesAndVariants", "manage"),
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

  if (permissions[2]) {
    pages.push({
      title: "Einstellungen",
      url: "/app/fleet/settings/manufacturer",
    });
  }

  return pages;
};
