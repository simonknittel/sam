import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Dashboard",
    default: "Dashboard",
  },
};

export default function Layout({ children }: LayoutProps<"/app/dashboard">) {
  return (
    <DefaultLayout title="Dashboard" slug="dashboard">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
