import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/documents/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Dokumente",
    default: "Dokumente",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/documents">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Dokumente" slug="documents" pages={pages}>
      {children}
    </DefaultLayout>
  );
}
