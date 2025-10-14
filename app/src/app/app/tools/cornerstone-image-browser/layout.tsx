import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/cornerstone-image-browser/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Cornerstone Image Browser",
    default: "Cornerstone Image Browser",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/tools/cornerstone-image-browser">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout
      title="Cornerstone Image Browser"
      pages={pages}
      slug="tools/cornerstone-image-browser"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
