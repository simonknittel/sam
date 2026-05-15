import { requireAuthenticationPage } from "@/modules/auth/server";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { AllSilcTransactionsTable } from "@/modules/silc/components/AllSilcTransactionsTable";
import { SilcTransactionsFilters } from "@/modules/silc/components/SilcTransactionsFilters";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaktionen",
};

export default async function Page({
  searchParams,
}: PageProps<"/app/silc/transactions">) {
  const authentication = await requireAuthenticationPage(
    "/app/silc/transactions",
  );
  await authentication.authorizePage("silcTransactionOfOtherCitizen", "read");

  return (
    <SidebarLayout sidebar={<SilcTransactionsFilters />}>
      <SuspenseWithErrorBoundaryTile>
        <AllSilcTransactionsTable searchParams={searchParams} />
      </SuspenseWithErrorBoundaryTile>
    </SidebarLayout>
  );
}
