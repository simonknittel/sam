import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { getNavigationItems } from "@/modules/events/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Events",
    default: "Events",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/events">) {
  const pages = await getNavigationItems();

  return (
    <DefaultLayout title="Events" pages={pages} slug="events">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
