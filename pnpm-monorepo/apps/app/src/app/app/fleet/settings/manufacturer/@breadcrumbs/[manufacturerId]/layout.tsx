import { Link } from "@/modules/common/components/Link";

export default function Layout({
  children,
}: LayoutProps<"/app/fleet/settings/manufacturer/[manufacturerId]">) {
  return (
    <>
      <Link
        href="/app/fleet/settings/manufacturer"
        className="text-brand-red-500 hover:text-brand-red-300 transition-colors"
      >
        Alle Hersteller
      </Link>

      <span className="text-neutral-700">/</span>

      {children}
    </>
  );
}
