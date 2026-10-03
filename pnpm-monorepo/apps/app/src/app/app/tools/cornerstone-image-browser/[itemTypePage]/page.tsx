import { requireAuthenticationPage } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import Note from "@/modules/common/components/Note";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { cornerstoneImageBrowserItemTypes } from "@/modules/cornerstone-image-browser/utils/config";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";
import * as z from "zod";

const schema = z.array(
  z.object({
    ItemId: z.string(),
    Name: z.string(),
    Manu: z.string(),
  }),
);

type Params = Promise<{
  itemTypePage: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { itemTypePage } = await props.params;
    const itemTypeConfig = cornerstoneImageBrowserItemTypes.find(
      (itemType) => itemType.page === itemTypePage,
    );
    if (!itemTypeConfig) notFound();

    return {
      title: itemTypeConfig.title,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/tools/cornerstone-image-browser/[itemTypePage]">) {
  await requireAuthenticationPage(
    "/app/tools/cornerstone-image-browser/[itemType]",
  );

  const { itemTypePage } = await params;
  const itemTypeConfig = cornerstoneImageBrowserItemTypes.find(
    (itemType) => itemType.page === itemTypePage,
  );
  if (!itemTypeConfig) notFound();

  const t = await getTranslations();

  const response = await fetch(itemTypeConfig.dataUrl, {
    next: {
      revalidate: 86400, // 24 hours
    },
  });
  if (!response.ok) {
    log.error("Failed to load data from Cornerstone", {
      status: response.status,
      responseBody: await response.text(),
    });
    return (
      <>
        <Link
          href="/app/tools"
          className="inline-flex items-center gap-2 text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300"
        >
          <FaChevronLeft />
          Alle Tools
        </Link>

        <h1 className="mt-2 text-xl leading-tight font-bold">
          {itemTypeConfig.title} - Cornerstone Image Browser
        </h1>

        <Note
          type="error"
          className="mt-4"
          message={t("Common.internalServerError")}
        />
      </>
    );
  }
  const data = (await response.json()) as unknown;
  const parsedData = schema.safeParse(data);
  if (!parsedData.success) {
    log.error("Failed to parse data from Cornerstone", {
      error: parsedData.error,
    });
    return (
      <>
        <h1 className="text-xl leading-tight font-bold">
          {itemTypeConfig.title}
        </h1>

        <Note
          type="error"
          className="mt-4"
          message={t("Common.internalServerError")}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl leading-tight font-bold">
        {itemTypeConfig.title}
      </h1>

      {!parsedData.success ? (
        <Note
          type="error"
          className="mt-4"
          message={t("Common.internalServerError")}
        />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {parsedData.data.map((item) => (
            <Link
              key={item.ItemId}
              href={`${itemTypeConfig.linkBase}/${item.ItemId}`}
              className="group flex h-full flex-col overflow-hidden rounded-secondary"
              target="_blank"
              rel="noreferrer"
            >
              <div className="relative flex flex-1 flex-col justify-center bg-secondary group-hover:bg-tertiary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://cstone.space/uifimages/${item.ItemId}.png`}
                  alt=""
                  className="relative z-10 aspect-square h-auto w-full object-contain"
                  loading="lazy"
                />
                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-sm text-neutral-500">
                  Bild nicht
                  <br />
                  verfügbar
                </p>
              </div>

              <div className="flex flex-1 flex-col justify-end gap-1 p-2 leading-tight group-hover:bg-tertiary">
                {item.Manu && (
                  <p className="text-xs text-gray-500">{item.Manu}</p>
                )}

                <h3 className="text-sm font-bold">{item.Name}</h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
