import { requireAuthenticationPage } from "@/modules/auth/server";
import { getNavigationItems } from "@/modules/iam/utils/getNavigationItems";
import { forbidden, redirect } from "next/navigation";

export default async function Page() {
  await requireAuthenticationPage("/app/iam");

  const pages = await getNavigationItems();
  if (!pages?.[0]) forbidden();

  redirect(pages[0].url);
}
