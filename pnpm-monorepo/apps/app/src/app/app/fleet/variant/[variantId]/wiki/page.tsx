import { requireAuthenticationPage } from "@/modules/auth/server";
import { getVariantWikiContext } from "@/modules/wiki/queries/getVariantWikiContext";
import { getVariantWikiRootPath } from "@sam-monorepo/domain";
import { notFound, redirect } from "next/navigation";

/** The start page of the embed is the plain variant URL */
export default async function Page({
  params,
}: PageProps<"/app/fleet/variant/[variantId]/wiki">) {
  await requireAuthenticationPage("/app/fleet/variant/[variantId]/wiki");

  const { variantId } = await params;
  const context = await getVariantWikiContext(variantId);
  if (!context) notFound();

  redirect(getVariantWikiRootPath(variantId));
}
