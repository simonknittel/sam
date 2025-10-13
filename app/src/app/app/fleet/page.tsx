import { requireAuthenticationPage } from "@/modules/auth/server";
import { getNavigationItems } from "@/modules/fleet/utils/getNavigationItems";
import { type Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Flotte",
};

export default async function Page() {
  await requireAuthenticationPage("/app/fleet/org");

  const pages = await getNavigationItems();
  if (!pages?.[0]) forbidden();

  redirect(pages[0].url);
}
