export default function Layout({
  children,
}: LayoutProps<"/app/fleet/settings/manufacturer">) {
  return <div className="flex gap-2">{children}</div>;
}
