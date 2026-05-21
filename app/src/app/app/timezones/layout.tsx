import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Timezones",
    default: "Timezones",
  },
};

export default function Layout({ children }: LayoutProps<"/app/timezones">) {
  return (
    <DefaultLayout title="Timezones" slug="timezones">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
