import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { RichText } from "@/modules/common/components/RichText";
import { Tile } from "@/modules/common/components/Tile";
import { cornerstoneImageBrowserItemTypes } from "@/modules/cornerstone-image-browser/utils/config";

export const revalidate = 86400; // 24 hours

export default async function Page() {
  await requireAuthenticationPage("/app/tools/cornerstone-image-browser");

  return (
    <MaxWidthContent maxWidth="prose">
      <RichText className="background-secondary rounded-primary p-4">
        <p>
          Du bist auf der Suche nach einem bestimmten Rüstungsteil, weißt aber
          nicht den Namen? Cornerstone bietet eine umfangreiche Datenbank mit
          allen Items.
        </p>

        <p>
          Der Cornerstone Image Browser bietet eine einfache Möglichkeit alle
          Bilder von Cornerstone auf einem Blick zu sehen um schnell das
          passende Teil zu finden.
        </p>
      </RichText>

      <Tile heading="Kategorien" className="mt-4">
        <h2 className="font-bold">Rüstung</h2>

        <div className="mt-2 flex flex-wrap gap-x-4">
          {cornerstoneImageBrowserItemTypes
            .filter((item) => item.category === "armor")
            .map((item) => (
              <Link
                key={item.page}
                href={`/app/tools/cornerstone-image-browser/${item.page}`}
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline"
                prefetch={false}
              >
                {item.title}
              </Link>
            ))}
        </div>

        <h2 className="mt-4 font-bold">Klamotten</h2>

        <div className="mt-2 flex flex-wrap gap-x-4">
          {cornerstoneImageBrowserItemTypes
            .filter((item) => item.category === "clothing")
            .map((item) => (
              <Link
                key={item.page}
                href={`/app/tools/cornerstone-image-browser/${item.page}`}
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline"
                prefetch={false}
              >
                {item.title}
              </Link>
            ))}
        </div>

        <h2 className="mt-4 font-bold">Waffen</h2>

        <div className="mt-2 flex flex-wrap gap-x-4">
          {cornerstoneImageBrowserItemTypes
            .filter((item) => item.category === "weapons")
            .map((item) => (
              <Link
                key={item.page}
                href={`/app/tools/cornerstone-image-browser/${item.page}`}
                className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline"
                prefetch={false}
              >
                {item.title}
              </Link>
            ))}
        </div>
      </Tile>
    </MaxWidthContent>
  );
}
