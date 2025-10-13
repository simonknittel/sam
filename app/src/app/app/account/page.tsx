import { getNavigationItems } from "@/modules/account/utils/getNavigationItems";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { type Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Account",
};

export default async function Page() {
  await requireAuthenticationPage("/app/account");

  const pages = await getNavigationItems();
  if (!pages?.[0]) forbidden();

  redirect(pages[0].url);
}
