import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { searchParamsNextjsToURLSearchParams } from "@/modules/common/utils/searchParamsNextjsToURLSearchParams";
import { OrgFleetTile } from "@/modules/fleet/components/OrgFleetTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sinister Incorporated",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/fleet/org">) {
  const authentication = await requireAuthenticationPage("/app/fleet/org");
  await authentication.authorizePage("orgFleet", "read");

  const urlSearchParams =
    await searchParamsNextjsToURLSearchParams(searchParams);

  return (
    <SuspenseWithErrorBoundaryTile>
      <OrgFleetTile urlSearchParams={urlSearchParams} />
    </SuspenseWithErrorBoundaryTile>
  );
}
