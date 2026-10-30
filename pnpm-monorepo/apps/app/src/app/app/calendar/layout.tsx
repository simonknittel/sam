import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Kalender",
    default: "Kalender",
  },
};

export default function Layout({ children }: LayoutProps<"/app/calendar">) {
  return (
    <DefaultLayout title="Kalender" slug="calendar">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
