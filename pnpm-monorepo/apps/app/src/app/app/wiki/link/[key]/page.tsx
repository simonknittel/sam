import { requireAuthenticationPage } from "@/modules/auth/server";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
import { isWikiPageLinkKey } from "@/modules/wiki/utils/wikiPageLinks";
import { notFound, redirect } from "next/navigation";

/**
 * Stable URL for the configurable page links (see `WIKI_PAGE_LINKS`), so
 * client components and i18n strings can link them without resolving the
 * setting themselves. Falls back to the wiki landing page when unset.
 */
export default async function Page({
  params,
}: PageProps<"/app/wiki/link/[key]">) {
  await requireAuthenticationPage("/app/wiki/link/[key]");

  const { key } = await params;
  if (!isWikiPageLinkKey(key)) notFound();

  const target = await getWikiPageLinkTarget(key);
  redirect(target?.href ?? "/app/wiki");
}
