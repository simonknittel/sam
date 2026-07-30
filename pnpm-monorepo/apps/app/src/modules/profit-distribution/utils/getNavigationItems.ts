import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

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
};
