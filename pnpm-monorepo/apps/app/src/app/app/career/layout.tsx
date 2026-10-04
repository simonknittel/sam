import { getNavigationItems } from "@/modules/career/utils/getNavigationItems";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Karriere",
    default: "Karriere",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/career">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Karriere" pages={pages} slug="career">
      {children}
    </DefaultLayout>
  );
}
