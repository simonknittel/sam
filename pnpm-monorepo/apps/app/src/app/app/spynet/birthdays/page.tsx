import { requireAuthenticationPage } from "@/modules/auth/server";
import { UpcomingBirthdaysTile } from "@/modules/citizen/components/UpcomingBirthdaysTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Geburtstage",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/spynet/birthdays",
  );
  await authentication.authorizePage("citizen", "read");

  return (
    <div className="overflow-x-hidden">
      <SuspenseWithErrorBoundaryTile>
        <UpcomingBirthdaysTile />
      </SuspenseWithErrorBoundaryTile>
    </div>
  );
}
