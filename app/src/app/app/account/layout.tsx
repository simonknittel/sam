import { getNavigationItems } from "@/modules/account/utils/getNavigationItems";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Account",
    default: "Account",
  }
};

interface Props {
  readonly children?: ReactNode;
}

export default async function Layout({ children }: Props) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Account" pages={pages} slug="account">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
