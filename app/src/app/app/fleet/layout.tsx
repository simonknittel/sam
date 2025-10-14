import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/fleet/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Flotte",
    default: "Flotte",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/fleet">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Flotte" pages={pages} slug="fleet">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
