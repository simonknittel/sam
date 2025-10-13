import { requireAuthenticationPage } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import { AnalyticsCheckboxLoader } from "@/modules/settings/components/AnalyticsCheckboxLoader";
import { type Metadata } from "next";
import { forbidden } from "next/navigation";

export const metadata: Metadata = {
  title: "Analytics - Account",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/account/analytics",
  );
  if (!(await authentication.authorizePage("analytics", "manage"))) forbidden();

  return (
    <div className="flex flex-col gap-2">
      <Tile heading="Disable analytics">
        <p className="mb-4">Disables Vercel Analytics for this browser.</p>

        <AnalyticsCheckboxLoader />
      </Tile>
    </div>
  );
}
