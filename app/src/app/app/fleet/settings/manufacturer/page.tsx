import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { ManufacturersTile } from "@/modules/fleet/components/ManufacturersTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Einstellungen - Flotte",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/fleet/settings/manufacturers",
  );
  await authentication.authorizePage(
    "manufacturersSeriesAndVariants",
    "manage",
  );

  return (
    <SuspenseWithErrorBoundaryTile>
      <ManufacturersTile />
    </SuspenseWithErrorBoundaryTile>
  );
}
