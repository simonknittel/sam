import { Link } from "@/modules/common/components/Link";
import { getSeriesAndManufacturerById } from "@/modules/fleet/queries/getSeriesAndManufacturerById";
import { notFound } from "next/navigation";

export default async function Page(
  props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]/series/[seriesId]">,
) {
  const params = await props.params;
  const [series, manufacturer] = await getSeriesAndManufacturerById(
    params.seriesId,
    params.manufacturerId,
  );

  if (!series || !manufacturer) notFound();

  return (
    <>
      <Link
        href={`/app/fleet/settings/manufacturer/${manufacturer.id}`}
        className="text-brand-red-500 transition-colors hover:text-brand-red-300"
      >
        {manufacturer.name}
      </Link>

      <span className="text-neutral-700">/</span>

      <h1 className="font-bold">{series.name}</h1>
    </>
  );
}
