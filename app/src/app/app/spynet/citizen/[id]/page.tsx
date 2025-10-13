import { requireAuthenticationPage } from "@/modules/auth/server";
import { Overview } from "@/modules/citizen/components/Overview";
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
    <SuspenseWithErrorBoundaryTile>
      <Overview entity={entity} />
    </SuspenseWithErrorBoundaryTile>
  );
}
