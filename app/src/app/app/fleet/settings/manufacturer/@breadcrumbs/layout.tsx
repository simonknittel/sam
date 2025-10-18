export default function Layout({
  children,
}: LayoutProps<"/app/fleet/settings/manufacturer/[manufacturerId]">) {
  return <div className="flex gap-2">{children}</div>;
}
