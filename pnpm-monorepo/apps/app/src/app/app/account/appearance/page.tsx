import { requireAuthenticationPage } from "@/modules/auth/server";
import { SeasonalThemeSettings } from "@/modules/seasonal-events/components/SeasonalThemeSettings";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Darstellung",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/account/appearance",
  );
  if (!authentication.session.entity) notFound();

  return <SeasonalThemeSettings />;
}
