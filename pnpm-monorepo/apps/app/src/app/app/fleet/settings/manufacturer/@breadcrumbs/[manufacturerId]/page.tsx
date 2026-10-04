import { getManufacturerById } from "@/modules/fleet/queries/getManufacturerById";
import { notFound } from "next/navigation";

export default async function Page(
  props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]">,
) {
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
