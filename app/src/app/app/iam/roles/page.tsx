import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { RolesTile } from "@/modules/roles/components/RolesTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Rollen - IAM",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/iam/roles");
  await authentication.authorizePage("role", "manage");

  return (
    <MaxWidthContent>
      <SuspenseWithErrorBoundaryTile>
        <RolesTile />
      </SuspenseWithErrorBoundaryTile>
    </MaxWidthContent>
  );
}
