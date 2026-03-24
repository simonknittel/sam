import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - System Log",
    default: "System Log",
  },
};

export default function Layout({ children }: LayoutProps<"/app/system-log">) {
  return (
    <DefaultLayout title="System Log" slug="system-log">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
