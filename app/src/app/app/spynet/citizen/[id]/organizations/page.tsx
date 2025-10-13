import { requireAuthenticationPage } from "@/modules/auth/server";
import { OrganizationMembershipHistory } from "@/modules/citizen/components/OrganizationMembershipHistory";
import { OrganizationMembershipsTile } from "@/modules/citizen/components/OrganizationMembershipsTile";
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
      title: `Organisationen - ${entity.handle || entity.id}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/spynet/citizen/[id]/organizations">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]/organizations",
  );
  await authentication.authorizePage("organizationMembership", "read");

  const entity = await getCitizenById((await params).id);
  if (!entity) notFound();

  return (
    <div className="flex flex-col gap-4">
      <SuspenseWithErrorBoundaryTile>
        <OrganizationMembershipsTile id={entity.id} />
      </SuspenseWithErrorBoundaryTile>

      <SuspenseWithErrorBoundaryTile>
        <OrganizationMembershipHistory id={entity.id} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
