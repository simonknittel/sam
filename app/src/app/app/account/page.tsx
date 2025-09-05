import { getNavigationItems } from "@/account/components/Navigation/getNavigationItems";
import { requireAuthenticationPage } from "@/auth/server";
import { type Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Account | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  await requireAuthenticationPage("/app/account");

  const pages = await getNavigationItems();
  if (!pages?.[0]) forbidden();

  redirect(pages[0].path);
}
