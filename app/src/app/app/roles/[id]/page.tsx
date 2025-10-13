import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { OverviewTab } from "@/modules/roles/components/OverviewTab";
import { RoleDetailsTemplate } from "@/modules/roles/components/RoleDetailsTemplate";
import { getRoleById } from "@/modules/roles/queries";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const role = await getRoleById((await props.params).id);

    return {
      title: `${role?.name} - Rollen`,
    };
  },
);

export default async function Page({ params }: PageProps<"/app/roles/[id]">) {
  const authentication = await requireAuthenticationPage("/app/roles/[id]");
  await authentication.authorizePage("role", "manage");

  const roleId = (await params).id;
  const role = await getRoleById(roleId);
  if (!role) notFound();

  return (
    <RoleDetailsTemplate role={role}>
      <OverviewTab role={role} />
    </RoleDetailsTemplate>
  );
}
