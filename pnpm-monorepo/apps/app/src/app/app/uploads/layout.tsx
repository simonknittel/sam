import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Uploads",
    default: "Uploads",
  },
};

export default function Layout({ children }: LayoutProps<"/app/uploads">) {
  return (
    <DefaultLayout title="Uploads" slug="uploads">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
