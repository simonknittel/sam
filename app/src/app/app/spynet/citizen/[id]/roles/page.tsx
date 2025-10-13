import { requireAuthenticationPage } from "@/modules/auth/server";
import { Roles } from "@/modules/citizen/components/roles/Roles";
import { RolesHistory } from "@/modules/citizen/components/roles/RolesHistory";
import { getCitizenById } from "@/modules/citizen/queries";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    id: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const entity = await getCitizenById((await props.params).id);
    if (!entity) return {};

    return {
      title: `Rollen - ${entity.handle || entity.id}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/spynet/citizen/[id]/roles">) {
  await requireAuthenticationPage("/app/spynet/citizen/[id]/roles");

  const entity = await getCitizenById((await params).id);
  if (!entity) notFound();

  return (
    <div className="flex flex-col gap-4">
      <SuspenseWithErrorBoundaryTile>
        <Roles entity={entity} />
      </SuspenseWithErrorBoundaryTile>

      <SuspenseWithErrorBoundaryTile>
        <RolesHistory entity={entity} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
