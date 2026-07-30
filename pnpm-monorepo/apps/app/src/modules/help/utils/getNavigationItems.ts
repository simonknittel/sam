import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  // const permissions: boolean[] = await Promise.all([]);

  const pages: Page[] = [];

  pages.push({
    title: "Mithilfe",
    url: "/app/help/contributing",
  });

  pages.push({
    title: "Support",
    url: "/app/help/support",
  });

  return pages;
};
