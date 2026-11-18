import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Statistiken",
    default: "Statistiken",
  },
};

/**
 * Without a width limit: the frame of the dashboard uses the full content
 * area, like the frame of an external app
 */
export default function Layout({ children }: LayoutProps<"/app/statistics">) {
  return (
    <DefaultLayout title="Statistiken" slug="statistics">
      {children}
    </DefaultLayout>
  );
}
