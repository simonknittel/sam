import { getExternalAppBySlug } from "@/modules/apps/utils/queries/getExternalAppBySlug";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { IframeLayout } from "@/modules/common/components/layouts/IframeLayout";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { resolveEmbedUrl } from "@/modules/embed-authentication/utils/resolveEmbedUrl";
import { notFound, redirect } from "next/navigation";

type Params = Promise<{
  appSlug: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const { appSlug } = await props.params;
    const app = await getExternalAppBySlug(appSlug);
    if (!app) notFound();

    return {
      title: `${app.name}`,
      description: app.description || undefined,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/external/[appSlug]">) {
  const { session } = await requireAuthenticationPage(
    "/app/external/[appSlug]",
  );

  const { appSlug } = await params;
  const app = await getExternalAppBySlug(appSlug);
  if (!app) notFound();

  if ("externalUrl" in app.defaultPage) redirect(app.defaultPage.externalUrl);

  return (
    <IframeLayout
      src={await resolveEmbedUrl(
        app.defaultPage.iframeUrl,
        session,
        app.embedAuthentication,
      )}
    />
  );
}
