import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/spynet/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Spynet",
    template: "%s - Spynet",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/spynet">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Spynet" pages={pages} slug="spynet">
      {children}
    </DefaultLayout>
  );
}
