import { requireAuthenticationPage } from "@/modules/auth/server";
import { ProfileTile } from "@/modules/citizen/components/ProfileTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { TileSkeleton } from "@/modules/dashboard/components/TileSkeleton";
import { CalendarTile } from "@/modules/events/components/CalendarTile";
import { SpynetSearchTile } from "@/modules/spynet/components/SpynetSearchTile/SpynetSearchTile";
import { TasksDashboardTile } from "@/modules/tasks/components/DashboardTile";
import { type Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Dashboard | S.A.M. - Sinister Incorporated",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/dashboard");

  const [disableAlgolia, canCitizenRead, canOrgRead, canEventRead] =
    await Promise.all([
      getUnleashFlag(UNLEASH_FLAG.DisableAlgolia),
      authentication.authorize("citizen", "read"),
      authentication.authorize("organization", "read"),
      authentication.authorize("event", "read"),
    ]);

  const showCalendar = canEventRead;
  const showSpynetSearchTile =
    !disableAlgolia && (canCitizenRead || canOrgRead);

  return (
    <div className="flex gap-6 flex-row flex-wrap justify-center @container">
      {showCalendar && (
        <Suspense
          fallback={
            <TileSkeleton className="flex-none @7xl:flex-1 max-w-[400px] @7xl:max-w-none" />
          }
        >
          <CalendarTile className="flex-none @7xl:flex-1 max-w-[400px] @7xl:max-w-none" />
        </Suspense>
      )}

      <div className="flex flex-col gap-6 max-w-[400px] flex-none">
        <TasksDashboardTile />

        <section className="flex flex-col gap-[2px] flex-none">
          <h2 className="font-thin text-2xl self-start mb-2">Spynet</h2>

          {showSpynetSearchTile && <SpynetSearchTile />}

          <SuspenseWithErrorBoundaryTile>
            <ProfileTile />
          </SuspenseWithErrorBoundaryTile>
        </section>
      </div>
    </div>
  );
}
