import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";

/**
 * The career layout has no padding, because the flow pages fill the viewport
 */
export default function Layout({
  children,
}: LayoutProps<"/app/career/settings">) {
  return <MaxWidthContent>{children}</MaxWidthContent>;
}
