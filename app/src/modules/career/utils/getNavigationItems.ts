import { authenticate } from "@/modules/auth/server";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { getMyReadableFlows } from "../queries/getMyReadableFlows";

export const getNavigationItems = async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const flows = await getMyReadableFlows();

  const pages: Page[] = flows.map((flow) => ({
    title: flow.name,
    url: `/app/career/${flow.id}`,
  }));

  return pages;
};
