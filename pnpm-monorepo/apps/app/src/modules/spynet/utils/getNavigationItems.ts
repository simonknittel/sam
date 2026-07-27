import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const permissions = await Promise.all([
    authentication.authorize("citizen", "read"),
    authentication.authorize("organization", "read"),
    authentication.authorize("citizen", "create"),
    authentication.authorize("organization", "create"),
    authentication.authorize("spynetActivity", "read"),
    authentication.authorize("spynetCitizen", "read"),
    authentication.authorize("spynetNotes", "read"),
    authentication.authorize("spynetOther", "read"),
    authentication.authorize("noteType", "manage"),
    authentication.authorize("classificationLevel", "manage"),
  ]);

  const pages: Page[] = [];

  if (permissions[0] || permissions[1]) {
    pages.push({
      title: "Suche",
      url: "/app/spynet",
    });
  }

  if (permissions[4]) {
    pages.push({
      title: "Aktivität",
      url: "/app/spynet/activity",
    });
  }

  if (permissions[0] && permissions[5]) {
    pages.push({
      title: "Citizen",
      url: "/app/spynet/citizen",
    });
  }

  if (permissions[0] && permissions[6]) {
    pages.push({
      title: "Notizen",
      url: "/app/spynet/notes",
    });
  }

  if (permissions[0] && permissions[7]) {
    pages.push({
      title: "Sonstige",
      url: "/app/spynet/other",
    });
  }

  if (permissions[8] || permissions[9]) {
    pages.push({
      title: "Einstellungen",
      url: "/app/spynet/settings",
    });
  }

  return pages;
};
