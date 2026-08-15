import { requireAuthenticationPage } from "@/modules/auth/server";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getVariantWikiRootPath } from "@/modules/wiki/utils/wikiPageHref";
import { notFound, redirect } from "next/navigation";

/**
 * The embed's start page is the plain variant URL — this bare path only
 * redirects there (or 404s like every embed route when there is no
 * readable embed).
 */
export default async function Page({
  params,
}: PageProps<"/app/fleet/variant/[variantId]/wiki">) {
  await requireAuthenticationPage("/app/fleet/variant/[variantId]/wiki");

  const { variantId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) notFound();

  redirect(getVariantWikiRootPath(variantId));
}
