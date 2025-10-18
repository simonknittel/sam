import { ImageUpload } from "@/modules/common/components/ImageUpload";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { EditableManufacturerName } from "@/modules/fleet/components/EditableManufacturerName";
import { SeriesTile } from "@/modules/fleet/components/SeriesTile";
import { getManufacturerById } from "@/modules/fleet/queries";
import clsx from "clsx";
import { notFound } from "next/navigation";

type Params = Promise<
  Readonly<{
    manufacturerId: string;
  }>
>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const manufacturer = await getManufacturerById(
      (await props.params).manufacturerId,
    );
    if (!manufacturer) return {};

    return {
      title: `${manufacturer.name}`,
    };
  },
);

interface Props {
  readonly params: Params;
}

export default async function Page(props: Props) {
  const manufacturer = await getManufacturerById(
    (await props.params).manufacturerId,
  );
  if (!manufacturer) notFound();

  return (
    <main className="flex gap-8 items-start flex-col xl:flex-row">
      <section className="rounded-primary overflow-hidden w-full xl:w-[400px]">
        <ImageUpload
          resourceType="manufacturer"
          resourceId={manufacturer.id}
          resourceAttribute="imageId"
          imageId={manufacturer.image?.id}
          imageMimeType={manufacturer.image?.mimeType}
          width={400}
          height={128}
          className={clsx(
            "bg-black p-2 text-neutral-500 hover:text-neutral-300 transition-colors",
            {
              "h-32 after:content-['Logo_hochladen'] flex items-center justify-center":
                !manufacturer.imageId,
            },
          )}
          imageClassName="w-full h-32"
          pendingClassName="w-full h-32"
        />

        <div className="p-8 bg-neutral-800/50">
          <p className="font-bold mb-4">Hersteller</p>

          <dl className="mt-4">
            <dt className="text-neutral-500">Name</dt>
            <dd>
              <EditableManufacturerName manufacturer={manufacturer} />
            </dd>
          </dl>
        </div>
      </section>

      <SuspenseWithErrorBoundaryTile className="w-full flex-1">
        <SeriesTile
          manufacturerId={manufacturer.id}
          className="w-full flex-1"
        />
      </SuspenseWithErrorBoundaryTile>
    </main>
  );
}
