import { requireAuthenticationPage } from "@/modules/auth/server";
import { ProfileTile } from "@/modules/citizen/components/ProfileTile";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";
import { TileSkeleton } from "@/modules/dashboard/components/TileSkeleton";
import { CalendarTile } from "@/modules/events/components/CalendarTile";
import { SeasonalGreetingBanner } from "@/modules/seasonal-events/components/SeasonalGreetingBanner";
import { SeasonalSpynetSearchTileSlot } from "@/modules/seasonal-events/components/SeasonalSpynetSearchTileSlot";
import { SpynetSearchTile } from "@/modules/spynet/components/SpynetSearchTile/SpynetSearchTile";
import { TasksDashboardTile } from "@/modules/tasks/components/DashboardTile";
import { NewTasksDashboardTile } from "@/modules/tasks/components/NewTasksDashboardTile";
import { WikiDashboardPageTile } from "@/modules/wiki/components/WikiDashboardPageTile";
import { Suspense } from "react";

export default async function Page() {
  const authentication = await requireAuthenticationPage("/app/dashboard");

  const [canCitizenRead, canOrgRead, canEventRead, canTaskRead] =
    await Promise.all([
      authentication.authorize("citizen", "read"),
      authentication.authorize("organization", "read"),
      authentication.authorize("event", "read"),
      authentication.authorize("task", "read"),
    ]);

  const showCalendar = canEventRead;
  const showSpynetSearchTile = canCitizenRead || canOrgRead;

  return (
    <div className="flex flex-col gap-6">
      <SeasonalGreetingBanner />

      {/* The tiles keep their own container, thus the banner above them
      cannot change their layout. */}
      <div className="@container/main flex flex-row flex-wrap justify-center gap-6">
        <div className="flex w-100 flex-none flex-col gap-6 @7xl/main:max-w-none @7xl/main:flex-1">
          {showCalendar && (
            <Suspense fallback={<TileSkeleton />}>
              <CalendarTile className="@container/events" />
            </Suspense>
          )}

          <SuspenseWithErrorBoundaryTile>
            <WikiDashboardPageTile />
          </SuspenseWithErrorBoundaryTile>
        </div>

        <div className="flex w-100 flex-none flex-col gap-6">
          {canTaskRead && (
            <>
              <TasksDashboardTile />
              <NewTasksDashboardTile />
            </>
          )}

          <section className="flex flex-none flex-col gap-0.5">
            <h2 className="mb-2 self-start font-mono text-2xl font-thin uppercase">
              Spynet
            </h2>

            {showSpynetSearchTile && (
              <div className="relative">
                <SpynetSearchTile />
                <SeasonalSpynetSearchTileSlot />
              </div>
            )}

            <SuspenseWithErrorBoundaryTile>
              <ProfileTile />
            </SuspenseWithErrorBoundaryTile>
          </section>
        </div>
      </div>
    </div>
  );
}
