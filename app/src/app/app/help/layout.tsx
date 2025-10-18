import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/help/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Hilfe",
    default: "Hilfe",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/help">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Hilfe" slug="help" pages={pages}>
      {children}
    </DefaultLayout>
  );
}
