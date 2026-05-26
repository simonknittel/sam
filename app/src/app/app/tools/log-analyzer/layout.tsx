import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/log-analyzer/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Log Analyzer",
    default: "Log Analyzer",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/tools/log-analyzer">) {
  const [pages] = await Promise.all([getNavigationItems()]);

  return (
    <DefaultLayout title="Log Analyzer" slug="tools/log-analyzer" pages={pages}>
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
