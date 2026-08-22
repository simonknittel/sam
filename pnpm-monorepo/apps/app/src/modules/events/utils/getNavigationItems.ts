import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";
import { hasEventTemplatesAccess } from "@/modules/event-templates/queries/hasEventTemplatesAccess";
import { EVENT_TEMPLATES_PATH } from "@/modules/event-templates/utils/eventTemplateConstraints";

export const getNavigationItems = createNavigationItems(async () => {
  const pages: Page[] = [
    {
      title: "Alle Events",
      url: "/app/events",
    },
  ];

  if (await hasEventTemplatesAccess())
    pages.push({
      title: "Vorlagen",
      url: EVENT_TEMPLATES_PATH,
    });

  return pages;
});
