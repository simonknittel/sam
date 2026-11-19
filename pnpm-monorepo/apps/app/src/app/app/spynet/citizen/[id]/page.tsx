import { requireAuthenticationPage } from "@/modules/auth/server";
import { Overview } from "@/modules/citizen/components/Overview";
import { ProfileTile } from "@/modules/citizen/components/ProfileTile";
import { getCitizenById } from "@/modules/citizen/queries/getCitizenById";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/spynet/citizen/[id]">) => {
    const entity = await getCitizenById((await props.params).id);
    if (!entity) return {};

    return {
      title: `${entity.handle || entity.id}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/spynet/citizen/[id]">) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]",
  );
  await authentication.authorizePage("citizen", "read");

  const entity = await getCitizenById((await params).id);
  if (!entity) notFound();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* The same width as on the dashboard and in the citizen popover */}
      <SuspenseWithErrorBoundaryTile className="lg:w-100 lg:flex-none">
        <ProfileTile
          citizenId={entity.id}
          hideSpynetLink
          className="lg:w-100 lg:flex-none"
        />
      </SuspenseWithErrorBoundaryTile>

      <SuspenseWithErrorBoundaryTile className="lg:min-w-0 lg:flex-1">
        <Overview entity={entity} className="lg:min-w-0 lg:flex-1" />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
