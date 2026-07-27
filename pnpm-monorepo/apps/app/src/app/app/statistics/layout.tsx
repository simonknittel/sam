import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Statistiken",
    default: "Statistiken",
  },
};

export default function Layout({ children }: LayoutProps<"/app/statistics">) {
  return (
    <DefaultLayout title="Statistiken" slug="statistics">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
