import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s - Blueprints", default: "Blueprints" },
};

export default function Layout({ children }: LayoutProps<"/app/blueprints">) {
  return (
    <DefaultLayout title="Blueprints" slug="blueprints">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
