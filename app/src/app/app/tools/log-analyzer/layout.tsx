import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Log Analyzer",
    default: "Log Analyzer",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <DefaultLayout title="Log Analyzer" slug="tools/log-analyzer">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
