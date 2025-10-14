import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Einstellungen",
    default: "Einstellungen",
  },
};

export default function Layout({ children }: LayoutProps<"/app/settings">) {
  return (
    <DefaultLayout title="Einstellungen" slug="settings">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
