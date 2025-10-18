import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Apps",
    default: "Apps",
  },
};

export default function Layout({ children }: LayoutProps<"/app/apps">) {
  return (
    <DefaultLayout title="Apps" slug="apps">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
