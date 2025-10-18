import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { Tile } from "@/modules/users/components/Tile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Benutzer",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/users");
  await authentication.authorizePage("user", "read");

  return (
    <MaxWidthContent>
      <SuspenseWithErrorBoundaryTile>
        <Tile />
      </SuspenseWithErrorBoundaryTile>
    </MaxWidthContent>
  );
}
