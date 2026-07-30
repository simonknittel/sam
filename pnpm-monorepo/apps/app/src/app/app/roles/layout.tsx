import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/iam/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Rollen",
    default: "Rollen",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/roles">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="IAM" pages={pages} slug="iam">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
