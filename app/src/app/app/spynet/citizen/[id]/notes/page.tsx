import { requireAuthenticationPage } from "@/modules/auth/server";
import { Notes } from "@/modules/citizen/components/notes/Notes";
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
      title: `Notizen - ${entity.handle || entity.id} - Spynet`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]/notes",
  );
  await authentication.authorizePage("citizen", "read");

  const entity = await getCitizenById((await props.params).id);
  if (!entity) notFound();

  return (
    <Template citizen={entity}>
      <SuspenseWithErrorBoundaryTile>
        <Notes entity={entity} />
      </SuspenseWithErrorBoundaryTile>
    </Template>
  );
}
