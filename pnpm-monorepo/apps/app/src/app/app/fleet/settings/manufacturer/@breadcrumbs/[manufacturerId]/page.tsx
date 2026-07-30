import { getManufacturerById } from "@/modules/fleet/queries/getManufacturerById";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    manufacturerId: string;
  }>
>;

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const manufacturer = await getManufacturerById(
    (await props.params).manufacturerId,
  );
  if (!manufacturer) notFound();

  return (
    <>
      <h1 className="font-bold">{manufacturer.name}</h1>
    </>
  );
}
