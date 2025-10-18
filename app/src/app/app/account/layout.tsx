import { getNavigationItems } from "@/modules/account/utils/getNavigationItems";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Account",
    default: "Account",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/account">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Account" pages={pages} slug="account">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
