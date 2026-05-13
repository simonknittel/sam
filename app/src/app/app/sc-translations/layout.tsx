import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - SC Translations",
    default: "SC Translations",
  },
};

export default function Layout({
  children,
}: LayoutProps<"/app/sc-translations">) {
  return (
    <DefaultLayout title="SC Translations" slug="sc-translations">
      <MaxWidthContent maxWidth="prose">{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
