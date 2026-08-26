import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { InheritanceMatrix } from "@/modules/roles/components/InheritanceMatrix";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Vererbungsmatrix",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/iam/inheritance-matrix",
  );
  await authentication.authorizePage("role", "manage");

  return (
    <SuspenseWithErrorBoundaryTile>
      <InheritanceMatrix />
    </SuspenseWithErrorBoundaryTile>
  );
}
