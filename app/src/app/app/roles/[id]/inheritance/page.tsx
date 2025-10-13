import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { InheritanceForm } from "@/modules/roles/components/InheritanceForm";
import { RoleDetailsTemplate } from "@/modules/roles/components/RoleDetailsTemplate";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import { getRoleById, getRoles } from "@/modules/roles/queries";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const role = await getRoleById((await props.params).id);

    return {
      title: `${role?.name} - Vererbungen`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/roles/[id]/inheritance">) {
  const authentication = await requireAuthenticationPage(
    "/app/roles/[id]/inheritance",
  );
  await authentication.authorizePage("role", "manage");

  const roleId = (await params).id;
  const role = await getRoleById(roleId);
  if (!role) notFound();

  const roles = await getRoles();
  const _roles = roles
    .filter((r) => r.id !== role.id)
    .toSorted((a, b) => a.name.localeCompare(b.name));

  return (
    <RoleDetailsTemplate role={role}>
      <section className="rounded-primary bg-neutral-800/50 p-4">
        <h2 className="text-xl font-bold mb-2">Vererbungen</h2>
        <p className="max-w-prose">
          Die Rolle <SingleRole role={role} className="inline-flex align-sub" />{" "}
          erhält alle Berechtigungen von den folgenden ausgewählten Rollen. Im
          Karrieresystem gelten die folgenden Rollen ebenfalls als
          freigeschaltet. Verschachtelte Vererbungen werden nicht
          berücksichtigt.
        </p>

        <InheritanceForm currentRole={role} roles={_roles} className="mt-4" />
      </section>
    </RoleDetailsTemplate>
  );
}
