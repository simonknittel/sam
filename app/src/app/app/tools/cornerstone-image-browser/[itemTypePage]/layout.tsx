import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";

export default function Layout({
  children,
}: LayoutProps<"/app/tools/cornerstone-image-browser/[itemTypePage]">) {
  return <MaxWidthContent>{children}</MaxWidthContent>;
}
