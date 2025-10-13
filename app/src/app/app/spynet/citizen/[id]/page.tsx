import { requireAuthenticationPage } from "@/modules/auth/server";
import { Overview } from "@/modules/citizen/components/Overview";
import { Roles } from "@/modules/citizen/components/roles/Roles";
import { Template } from "@/modules/citizen/components/Template";
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
      title: `${entity.handle || entity.id} - Spynet`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]",
  );
  await authentication.authorizePage("citizen", "read");

  const entity = await getCitizenById((await props.params).id);
  if (!entity) notFound();

  return (
    <Template citizen={entity}>
      <div className="flex flex-col gap-4 md:flex-row">
        <SuspenseWithErrorBoundaryTile className="md:w-1/2 3xl:self-start">
          <Overview entity={entity} className="md:w-1/2 3xl:self-start" />
        </SuspenseWithErrorBoundaryTile>

        <div className="flex flex-col gap-4 md:w-1/2">
          <SuspenseWithErrorBoundaryTile>
            <Roles entity={entity} />
          </SuspenseWithErrorBoundaryTile>
        </div>
      </div>
    </Template>
  );
}
