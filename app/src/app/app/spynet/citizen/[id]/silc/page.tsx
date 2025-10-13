import { requireAuthenticationPage } from "@/modules/auth/server";
import { Template } from "@/modules/citizen/components/Template";
import { getCitizenById } from "@/modules/citizen/queries";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { SilcTransactionsTable } from "@/modules/silc/components/SilcTransactionsTable";
import { forbidden, notFound } from "next/navigation";

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
      title: `SILC - ${entity.handle || entity.id} - Spynet`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/citizen/[id]/silc",
  );
  if (!authentication.session.entity) forbidden();

  const entity = await getCitizenById((await props.params).id);
  if (!entity) notFound();

  if (entity.id === authentication.session.entity.id) {
    await authentication.authorizePage(
      "silcTransactionOfCurrentCitizen",
      "read",
    );
  } else {
    await authentication.authorizePage("silcTransactionOfOtherCitizen", "read");
  }

  return (
    <Template citizen={entity}>
      <SuspenseWithErrorBoundaryTile>
        <SilcTransactionsTable citizenId={entity.id} />
      </SuspenseWithErrorBoundaryTile>
    </Template>
  );
}
