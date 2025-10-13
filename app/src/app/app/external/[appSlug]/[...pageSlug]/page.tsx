import { getExternalAppBySlug } from "@/modules/apps/utils/queries";
import type { ExternalApp } from "@/modules/apps/utils/types";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { IframeLayout } from "@/modules/common/components/layouts/IframeLayout";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { notFound } from "next/navigation";

const findAppPage = (app: ExternalApp, pageSlug: string[]) => {
  if (!app.pages || app.pages.length <= 0) return null;

  const currentPageSlug = pageSlug.join("/");
  const page = app.pages
    .filter((page) => "slug" in page)
    .find((page) => page.slug === currentPageSlug);

  if (!page) return null;

  return page;
};

type Params = Promise<{
  appSlug: string;
  pageSlug: string[];
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { appSlug, pageSlug } = await props.params;
    const app = await getExternalAppBySlug(appSlug);
    if (!app) notFound();

    const page = findAppPage(app, pageSlug);
    if (!page) notFound();

    return {
      title: `${page.title} - ${app.name}`,
      description: app.description || undefined,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/external/[appSlug]/[...pageSlug]">) {
  await requireAuthenticationPage("/app/external/[appSlug]/[...pageSlug]");

  const { appSlug, pageSlug } = await params;
  const app = await getExternalAppBySlug(appSlug);
  if (!app) notFound();

  if (pageSlug.length <= 0) notFound();

  const page = findAppPage(app, pageSlug);
  if (!page) notFound();

  if (
    !("iframeUrl" in page) ||
    !page.iframeUrl ||
    typeof page.iframeUrl !== "string"
  )
    notFound();

  return <IframeLayout src={page.iframeUrl} />;
}
