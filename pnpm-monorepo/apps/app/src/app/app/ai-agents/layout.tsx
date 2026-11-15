import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/mcp-settings/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - KI-Agenten",
    default: "KI-Agenten",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/ai-agents">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="KI-Agenten" pages={pages} slug="ai-agents">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
