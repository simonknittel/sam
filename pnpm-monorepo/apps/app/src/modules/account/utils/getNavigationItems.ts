import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

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
};
