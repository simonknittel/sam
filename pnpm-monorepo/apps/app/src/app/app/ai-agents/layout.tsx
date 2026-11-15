import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - KI-Agenten",
    default: "KI-Agenten",
  },
};

export default function Layout({ children }: LayoutProps<"/app/ai-agents">) {
  return (
    <DefaultLayout title="KI-Agenten" slug="ai-agents">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
