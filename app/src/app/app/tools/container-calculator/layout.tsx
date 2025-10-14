import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s - Container Calculator",
    default: "Container Calculator",
  },
};

interface Props {
  readonly children?: ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <DefaultLayout
      title="Container Calculator"
      slug="tools/container-calculator"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
