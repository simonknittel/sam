import { requireAuthenticationPage } from "@/modules/auth/server";
import { ImageUpload } from "@/modules/common/components/ImageUpload";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { EditableManufacturerName } from "@/modules/fleet/components/EditableManufacturerName";
import { SeriesTile } from "@/modules/fleet/components/SeriesTile";
import { getManufacturerById } from "@/modules/fleet/queries/getManufacturerById";
import clsx from "clsx";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (
    props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]">,
  ) => {
    const manufacturer = await getManufacturerById(
      (await props.params).manufacturerId,
    );
    if (!manufacturer) return {};

    return {
      title: `${manufacturer.name}`,
    };
  },
);

export default async function Page(
  props: PageProps<"/app/fleet/settings/manufacturer/[manufacturerId]">,
) {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/settings/manufacturer/[manufacturerId]",
  );
  await authentication.authorizePage(
    "manufacturersSeriesAndVariants",
    "manage",
  );

  const manufacturer = await getManufacturerById(
    (await props.params).manufacturerId,
  );
  if (!manufacturer) notFound();

  return (
    <div className="flex flex-col items-start gap-8 xl:flex-row">
      <section className="w-full overflow-hidden rounded-primary xl:w-100">
        <ImageUpload
          resourceType="manufacturer"
          resourceId={manufacturer.id}
          resourceAttribute="imageId"
          imageId={manufacturer.image?.id}
          imageMimeType={manufacturer.image?.mimeType}
          width={400}
          height={128}
          className={clsx(
            "bg-black p-2 text-neutral-500 transition-colors hover:text-neutral-300",
            {
              "flex h-32 items-center justify-center after:content-['Logo_hochladen']":
                !manufacturer.imageId,
            },
          )}
          imageClassName="w-full h-32"
          pendingClassName="w-full h-32"
        />

        <div className="bg-neutral-800/50 p-8">
          <p className="mb-4 font-bold">Hersteller</p>

          <dl className="mt-4">
            <dt className="text-neutral-500">Name</dt>
            <dd>
              <EditableManufacturerName manufacturer={manufacturer} />
            </dd>
          </dl>
        </div>
      </section>

      <SuspenseWithErrorBoundaryTile className="w-full flex-1">
        <SeriesTile manufacturer={manufacturer} className="w-full flex-1" />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
