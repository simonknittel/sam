import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Container Calculator",
    default: "Container Calculator",
  },
};

export default function Layout({
  children,
}: LayoutProps<"/app/tools/container-calculator">) {
  return (
    <DefaultLayout
      title="Container Calculator"
      slug="tools/container-calculator"
    >
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
