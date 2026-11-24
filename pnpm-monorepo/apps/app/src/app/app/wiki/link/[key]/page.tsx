import { requireAuthenticationPage } from "@/modules/auth/server";
import { getWikiPageLinkTarget } from "@/modules/wiki/queries/getWikiSettings";
import { isWikiPageLinkKey } from "@/modules/wiki/utils/wikiPageLinks";
import { notFound, redirect } from "next/navigation";

/**
 * Stable URL for the configurable page links, so client components can link
 * them without resolving the setting themselves.
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
