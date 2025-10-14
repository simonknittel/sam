import { requireAuthenticationPage } from "@/modules/auth/server";
import { IframeLayout } from "@/modules/common/components/layouts/IframeLayout";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getDocuments } from "@/modules/documents/utils/queries";
import { notFound } from "next/navigation";

export const revalidate = 86400; // 24 hours

type Params = Promise<{
  slug: string[];
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { slug } = await props.params;

    const categories = await getDocuments();

    const document = categories
      .flatMap((category) => category.documents)
      .find((document) => document.slug === slug[0]);

    if (!document) notFound();

    return {
      title: document.name,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/documents/[...slug]">) {
  await requireAuthenticationPage("/app/documents/[...slug]");

  const { slug } = await params;

  const categories = await getDocuments();

  const document = categories
    .flatMap((category) => category.documents)
    .find((document) => document.slug === slug[0]);

  if (!document) notFound();

  return (
    <IframeLayout
      src={document.href}
      iframeProps={{
        sandbox: "allow-scripts allow-same-origin allow-forms allow-downloads",
      }}
    />
  );
}
