import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const permissions = await Promise.all([
    authentication.authorize("silcBalanceOfOtherCitizen", "read"),
    authentication.authorize("silcTransactionOfOtherCitizen", "read"),
    authentication.authorize("silcSetting", "manage"),
    authentication.authorize("profitDistributionCycle", "read"),
    authentication.authorize("profitDistributionCycle", "manage"),
  ]);

  const pages: Page[] = [];

  if (permissions[0]) {
    pages.push({
      title: "Dashboard",
      url: "/app/silc/dashboard",
    });
  }

  if (permissions[1]) {
    pages.push({
      title: "Transaktionen",
      url: "/app/silc/transactions",
    });
  }

  if (permissions[2]) {
    pages.push({
      title: "Einstellungen",
      url: "/app/silc/settings",
    });
  }

  return pages;
};
