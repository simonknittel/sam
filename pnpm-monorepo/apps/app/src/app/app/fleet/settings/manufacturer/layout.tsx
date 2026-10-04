import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s - Einstellungen",
    default: "Einstellungen",
  },
};

export default function Layout({
  children,
  breadcrumbs,
}: LayoutProps<"/app/fleet/settings/manufacturer">) {
  return (
    <>
      <div className="mb-4 text-xl">{breadcrumbs}</div>

      {children}
    </>
  );
}
