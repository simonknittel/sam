import { requireAuthenticationPage } from "@/modules/auth/server";
import { OverviewTab } from "@/modules/roles/components/OverviewTab";
import { getRoleById } from "@/modules/roles/queries";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/app/roles/[id]">) {
  const authentication = await requireAuthenticationPage("/app/roles/[id]");
  await authentication.authorizePage("role", "manage");

  const roleId = (await params).id;
  const role = await getRoleById(roleId);
  if (!role) notFound();

  return <OverviewTab role={role} />;
}
