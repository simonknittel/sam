import { Link } from "@/modules/common/components/Link";
import { getSeriesAndManufacturerById } from "@/modules/fleet/queries";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    manufacturerId: string;
    seriesId: string;
  }>
>;

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
    <>
      <Link
        href={`/app/fleet/settings/manufacturer/${manufacturer.id}`}
        className="text-brand-red-500 hover:text-brand-red-300 transition-colors"
      >
        {manufacturer.name}
      </Link>

      <span className="text-neutral-700">/</span>

      <h1 className="font-bold">{series.name}</h1>
    </>
  );
}
