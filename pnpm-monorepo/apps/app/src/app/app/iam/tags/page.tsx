import { requireAuthenticationPage } from "@/modules/auth/server";
import { MaxWidthContent } from "@/modules/common/components/layouts/MaxWidthContent";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { RoleTagListTile } from "@/modules/roles/components/tags/RoleTagListTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/iam/tags");
  await authentication.authorizePage("role", "manage");

  return (
    <MaxWidthContent>
      <SuspenseWithErrorBoundaryTile>
        <RoleTagListTile />
      </SuspenseWithErrorBoundaryTile>
    </MaxWidthContent>
  );
}
