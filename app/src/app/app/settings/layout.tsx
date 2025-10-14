import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Einstellungen",
    default: "Einstellungen",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <DefaultLayout title="Einstellungen" slug="settings">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
