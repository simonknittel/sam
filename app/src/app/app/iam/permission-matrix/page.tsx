import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { PermissionMatrix } from "@/modules/roles/components/PermissionMatrix";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Berechtigungsmatrix - IAM",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/iam/permission-matrix",
  );
  await authentication.authorizePage("role", "manage");

  return (
    <SuspenseWithErrorBoundaryTile>
      <PermissionMatrix />
    </SuspenseWithErrorBoundaryTile>
  );
}
