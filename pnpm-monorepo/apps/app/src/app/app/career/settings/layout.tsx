import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";

/**
 * The career layout leaves its content unpadded because the flow pages fill
 * the viewport themselves. The settings pages are ordinary content and get
 * the usual page frame here.
 */
export default function Layout({
  children,
}: LayoutProps<"/app/career/settings">) {
  return <MaxWidthContent>{children}</MaxWidthContent>;
}
