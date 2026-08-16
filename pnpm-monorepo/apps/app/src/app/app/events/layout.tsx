import { authenticate } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { CreateEventButton } from "@/modules/events/components/CreateEvent/CreateEventButton";
import { getNavigationItems } from "@/modules/events/utils/getNavigationItems";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Events",
    default: "Events",
  },
};

export default async function Layout({ children }: LayoutProps<"/app/events">) {
  const [pages, authentication] = await Promise.all([
    getNavigationItems(),
    authenticate(),
  ]);

  const showCta =
    authentication && (await authentication.authorize("event", "create"));

  return (
    <DefaultLayout
      title="Events"
      pages={pages}
      cta={showCta ? <CreateEventButton /> : undefined}
      slug="events"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
