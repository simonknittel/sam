import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";
import { getMyReadableFlows } from "../queries/getMyReadableFlows";

export const getNavigationItems = createNavigationItems(
  async (authentication) => {
    const [flows, canManage] = await Promise.all([
      getMyReadableFlows(),
      authentication.authorize("career", "manage"),
    ]);

    const pages: Page[] = flows.map((flow) => ({
      title: flow.name,
      url: `/app/career/${flow.slug}`,
    }));

    if (canManage) {
      pages.push({
        title: "Einstellungen",
        url: "/app/career/settings",
      });
    }

    return pages;
  },
);
