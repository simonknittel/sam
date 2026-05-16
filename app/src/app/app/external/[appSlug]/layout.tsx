import { getExternalAppBySlug } from "@/modules/apps/utils/queries/getExternalAppBySlug";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { DefaultLayout } from "@/modules/common/components/layouts/DefaultLayout";
import type { Page } from "@/modules/common/components/layouts/DefaultLayout/Navigation";
import { notFound } from "next/navigation";
import { FaInfoCircle } from "react-icons/fa";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/app/external/[appSlug]">) {
  await requireAuthenticationPage("/app/external/[appSlug]");

  const { appSlug } = await params;
  const app = await getExternalAppBySlug(appSlug);
  if (!app) notFound();

  const pages: Page[] =
    app.pages
      ?.filter((page) => "slug" in page || "externalUrl" in page)
      .map((page) => {
        if ("slug" in page && page.slug) {
          return {
            ...page,
            url: `/app/external/${app.slug}/${page.slug}`,
          };
        }

        if ("externalUrl" in page && page.externalUrl) {
          return {
            ...page,
            url: page.externalUrl,
            external: true,
          };
        }

        throw new Error("Page must have either a slug or an externalUrl");
      }) || [];

  pages?.push({
    title: "Info",
    url: `/app/external/${app.slug}/info`,
    icon: <FaInfoCircle />,
  });

  return (
    <DefaultLayout title={app.name} pages={pages} slug={`external/${app.slug}`}>
      {children}
    </DefaultLayout>
  );
}
