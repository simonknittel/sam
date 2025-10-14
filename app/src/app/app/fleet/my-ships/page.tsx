import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { MyFleetTile } from "@/modules/fleet/components/MyFleetTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Meine Schiffe",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/fleet");
  await authentication.authorizePage("ship", "manage");

  return (
    <SuspenseWithErrorBoundaryTile>
      <MyFleetTile />
    </SuspenseWithErrorBoundaryTile>
  );
}
