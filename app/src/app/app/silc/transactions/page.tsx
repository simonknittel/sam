import { requireAuthenticationPage } from "@/modules/auth/server";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { AllSilcTransactionsTable } from "@/modules/silc/components/AllSilcTransactionsTable";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaktionen - SILC",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/silc/transactions",
  );
  await authentication.authorizePage("silcTransactionOfOtherCitizen", "read");

  return (
    <SuspenseWithErrorBoundaryTile>
      <AllSilcTransactionsTable />
    </SuspenseWithErrorBoundaryTile>
  );
}
