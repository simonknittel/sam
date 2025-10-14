import { requireAuthenticationPage } from "@/modules/auth/server";
import { getNavigationItems } from "@/modules/fleet/utils/getNavigationItems";
import { forbidden, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/fleet/org");

  const pages = await getNavigationItems();
  if (!pages?.[0]) forbidden();

  redirect(pages[0].url);
}
