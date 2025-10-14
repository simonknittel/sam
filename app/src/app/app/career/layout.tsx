import { getNavigationItems } from "@/modules/career/utils/getNavigationItems";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Karriere",
    default: "Karriere",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default async function Layout({ children }: Props) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Karriere" pages={pages} slug="career">
      {children}
    </DefaultLayout>
  );
}
