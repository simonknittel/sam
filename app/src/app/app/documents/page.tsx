import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { getDocuments } from "@/modules/documents/utils/queries";
import { type Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Dokumente",
};

export default async function Page() {
  await requireAuthenticationPage("/app/documents");

  const categoriesWithAuthorizedDocuments = await getDocuments();

  return (
    <MaxWidthContent className="flex flex-col gap-4">
      {categoriesWithAuthorizedDocuments.map(({ name, documents }) => (
        <Tile
          key={name}
          heading={name}
          childrenClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-2 p-4 border-t border-neutral-800"
        >
          {documents.map((document) => (
            <div
              key={document.slug}
              className="flex items-center justify-center"
            >
              <Link
                href={`/app/documents/${document.slug}`}
                className="block"
                rel="noreferrer"
                title={document.name}
                prefetch={false}
              >
                <Image
                  src={document.src}
                  alt=""
                  width={391}
                  height={219}
                  unoptimized
                  loading="lazy"
                />
              </Link>
            </div>
          ))}
        </Tile>
      ))}
    </MaxWidthContent>
  );
}
