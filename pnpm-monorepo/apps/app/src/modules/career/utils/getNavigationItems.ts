import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { createNavigationItems } from "@/modules/common/utils/createNavigationItems";
import { getMyReadableFlows } from "../queries/getMyReadableFlows";

export const getNavigationItems = createNavigationItems(async () => {
  const flows = await getMyReadableFlows();

  const pages: Page[] = flows.map((flow) => ({
    title: flow.name,
    url: `/app/career/${flow.id}`,
  }));

  return pages;
});
