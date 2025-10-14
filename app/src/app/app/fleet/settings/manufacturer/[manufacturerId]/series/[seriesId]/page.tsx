import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { EditableSeriesName } from "@/modules/fleet/components/EditableSeriesName";
import { VariantsTile } from "@/modules/fleet/components/VariantsTile";
import { getSeriesAndManufacturerById } from "@/modules/fleet/queries";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    manufacturerId: string;
    seriesId: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const params = await props.params;
    const [series] = await getSeriesAndManufacturerById(
      params.seriesId,
      params.manufacturerId,
    );

    if (!series) return {};

    return {
      title: `${series.name}`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const params = await props.params;
  const [series, manufacturer] = await getSeriesAndManufacturerById(
    params.seriesId,
    params.manufacturerId,
  );

  if (!series || !manufacturer) notFound();

  return (
    <main className="flex gap-8 items-start flex-col xl:flex-row">
      <section className="p-8 bg-neutral-800/50 rounded-primary w-full xl:w-[400px]">
        <p className="font-bold mb-4">Serie</p>

        <dl>
          <dt className="text-neutral-500">Name</dt>
          <dd>
            <EditableSeriesName series={series} />
          </dd>
        </dl>
      </section>

      <SuspenseWithErrorBoundaryTile className="w-full flex-1">
        <VariantsTile
          manufacturerId={manufacturer.id}
          seriesId={series.id}
          className="w-full flex-1"
        />
      </SuspenseWithErrorBoundaryTile>
    </main>
  );
}
