import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Changelog",
    default: "Changelog",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <DefaultLayout title="Changelog" slug="changelog">
      <MaxWidthContent maxWidth="prose">{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
