import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Log Analyzer",
    default: "Log Analyzer",
  },
};

export default function Layout({
  children,
}: LayoutProps<"/app/tools/log-analyzer">) {
  return (
    <DefaultLayout title="Log Analyzer" slug="tools/log-analyzer">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
