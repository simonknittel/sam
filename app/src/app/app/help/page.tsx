import { requireAuthenticationPage } from "@/modules/auth/server";
import { getNavigationItems } from "@/modules/help/utils/getNavigationItems";
import { notFound, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/help");

  const pages = await getNavigationItems();
  if (!pages?.[0]) notFound();

  redirect(pages[0].url);
}
