import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { getNavigationItems } from "@/modules/penalty-points/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Strafpunkte",
    default: "Strafpunkte",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/penalty-points">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Strafpunkte" pages={pages} slug="penalty-points">
      {children}
    </DefaultLayout>
  );
}
