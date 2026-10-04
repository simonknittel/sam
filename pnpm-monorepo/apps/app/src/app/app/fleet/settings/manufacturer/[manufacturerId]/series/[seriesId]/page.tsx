import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { EditableSeriesName } from "@/modules/fleet/components/EditableSeriesName";
import { VariantsTile } from "@/modules/fleet/components/VariantsTile";
import { getSeriesAndManufacturerById } from "@/modules/fleet/queries/getSeriesAndManufacturerById";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (
    props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]/series/[seriesId]">,
  ) => {
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

export default async function Page(
  props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]/series/[seriesId]">,
) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/settings/manufacturer/[manufacturerId]/series/[seriesId]",
  );
  await authentication.authorizePage(
    "manufacturersSeriesAndVariants",
    "manage",
  );

  const params = await props.params;
  const [series, manufacturer] = await getSeriesAndManufacturerById(
    params.seriesId,
    params.manufacturerId,
  );

  if (!series || !manufacturer) notFound();

  return (
    <div className="flex flex-col items-start gap-8 xl:flex-row">
      <section className="w-full rounded-primary bg-neutral-800/50 p-8 xl:w-100">
        <p className="mb-4 font-bold">Serie</p>

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
    </div>
  );
}
