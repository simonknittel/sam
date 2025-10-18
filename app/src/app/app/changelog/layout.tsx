import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Changelog",
    default: "Changelog",
  },
};

export default function Layout({ children }: LayoutProps<"/app/changelog">) {
  return (
    <DefaultLayout title="Changelog" slug="changelog">
      <MaxWidthContent maxWidth="prose">{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
