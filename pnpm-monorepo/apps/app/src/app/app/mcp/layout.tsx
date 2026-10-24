import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - MCP",
    default: "MCP",
  },
};

export default function Layout({ children }: LayoutProps<"/app/mcp">) {
  return (
    <DefaultLayout title="MCP" slug="mcp">
      <MaxWidthContent>{children}</MaxWidthContent>
    </DefaultLayout>
  );
}
