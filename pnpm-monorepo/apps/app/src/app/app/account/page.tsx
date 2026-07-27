import { getNavigationItems } from "@/modules/account/utils/getNavigationItems";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { notFound, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/account");

  const pages = await getNavigationItems();
  if (!pages?.[0]) notFound();

  redirect(pages[0].url);
}
