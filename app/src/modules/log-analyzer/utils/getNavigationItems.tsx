import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const permissions = await Promise.all([
    authentication.authorize("logAnalyzer", "read"),
    authentication.authorize("logAnalyzerPattern", "manage"),
  ]);

  const pages: Page[] = [];

  if (permissions[0]) {
    pages.push({
      title: "Log Analyzer",
      url: "/app/tools/log-analyzer",
    });
  }

  if (permissions[1]) {
    pages.push({
      title: "Muster",
      url: "/app/tools/log-analyzer/patterns",
    });
  }

  return pages;
};
