import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/silc/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - SILC",
    default: "SILC",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/silc">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="SILC" pages={pages} slug="silc">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
