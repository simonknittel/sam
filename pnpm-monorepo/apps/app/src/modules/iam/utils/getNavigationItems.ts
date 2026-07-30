import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

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
};
