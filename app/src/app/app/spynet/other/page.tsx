import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { searchParamsNextjsToURLSearchParams } from "@/modules/common/utils/searchParamsNextjsToURLSearchParams";
import { type Metadata } from "next";
import OtherTableTile from "../../../../modules/citizen/components/OtherTableTile";

export const revalidate = 0; // TODO: Revert to 60

export const metadata: Metadata = {
  title: "Sonstige - Spynet",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/spynet/other">) {
  const authentication = await requireAuthenticationPage("/app/spynet/other");
  await Promise.all([
    authentication.authorizePage("citizen", "read"),
    authentication.authorizePage("spynetOther", "read"),
  ]);

  const urlSearchParams =
    await searchParamsNextjsToURLSearchParams(searchParams);

  return (
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <OtherTableTile searchParams={urlSearchParams} />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
