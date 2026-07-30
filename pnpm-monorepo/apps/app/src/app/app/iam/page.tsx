import { requireAuthenticationPage } from "@/modules/auth/server";
import { getNavigationItems } from "@/modules/iam/utils/getNavigationItems";
import { notFound, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/iam");

  const pages = await getNavigationItems();
  if (!pages?.[0]) notFound();

  redirect(pages[0].url);
}
