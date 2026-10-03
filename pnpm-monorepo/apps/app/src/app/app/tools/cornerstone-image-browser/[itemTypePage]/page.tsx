import { requireAuthenticationPage } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import Note from "@/modules/common/components/Note";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { cornerstoneImageBrowserItemTypes } from "@/modules/cornerstone-image-browser/utils/config";
import { log } from "@/modules/logging";
import { wikiPageLinkHref } from "@/modules/wiki/utils/wikiPageLinks";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
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

/**
 * Gets the items of one item type. Returns null if Cornerstone does not
 * respond in time or sends data that is not valid.
 */
const getItems = async (dataUrl: string) => {
  try {
    const response = await fetch(dataUrl, {
      next: {
        revalidate: 86400, // 24 hours
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      log.error("Failed to load data from Cornerstone", {
        status: response.status,
        responseBody: await response.text(),
      });
      return null;
    }

    const parsedData = schema.safeParse(await response.json());
    if (!parsedData.success) {
      log.error("Failed to parse data from Cornerstone", {
        error: parsedData.error,
      });
      return null;
    }

    return parsedData.data;
  } catch (error) {
    log.error("Failed to load data from Cornerstone", { error });
    return null;
  }
};

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

  const items = await getItems(itemTypeConfig.dataUrl);

  return (
    <>
      <h1 className="text-xl leading-tight font-bold">
        {itemTypeConfig.title}
      </h1>

      {items ? (
        <div className="mt-4 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((item) => (
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
      ) : (
        <Note
          type="error"
          className="mt-4"
          message={t.rich("Common.internalServerError", {
            link: (chunks) => (
              <Link
                href={wikiPageLinkHref("support")}
                className="text-interaction-500 underline hover:text-interaction-300 focus-visible:text-interaction-300 active:text-interaction-300"
              >
                {chunks}
              </Link>
            ),
          })}
        />
      )}
    </>
  );
}
