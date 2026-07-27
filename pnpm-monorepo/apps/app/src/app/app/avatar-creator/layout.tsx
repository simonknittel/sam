import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Avatar Creator",
    default: "Avatar Creator",
  },
};

export default function Layout({
  children,
}: LayoutProps<"/app/avatar-creator">) {
  return (
    <DefaultLayout title="Avatar Creator" slug="avatar-creator">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
