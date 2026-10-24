import { requireAuthenticationPage } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { CreateManualNotificationButton } from "@/modules/manual-notifications/components/CreateManualNotification/CreateManualNotificationButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Manuelle Benachrichtigungen",
    default: "Manuelle Benachrichtigungen",
  },
};

export default async function Layout({
  children,
}: LayoutProps<"/app/manual-notifications">) {
  const authentication = await requireAuthenticationPage();

  const showCta = await authentication.authorize(
    "manualNotification",
    "manage",
  );

  return (
    <DefaultLayout
      title="Manuelle Benachrichtigungen"
      cta={showCta ? <CreateManualNotificationButton /> : undefined}
      slug="manual-notifications"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
