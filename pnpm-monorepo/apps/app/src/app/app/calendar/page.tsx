import { requireAuthenticationPage } from "@/modules/auth/server";
import { CalendarDayList } from "@/modules/calendar/components/CalendarDayList";
import { CalendarFilters } from "@/modules/calendar/components/CalendarFilters";
import { getMyCalendarEntryTypeSettings } from "@/modules/calendar/queries/getMyCalendarEntryTypeSettings";
import { loadCalendarPage } from "@/modules/calendar/utils/calendarRange";
import { SidebarLayout } from "@/modules/common/components/layouts/SidebarLayout";
import { SuspenseWithErrorBoundaryTile } from "@/modules/common/components/SuspenseWithErrorBoundaryTile";

/**
 * Deliberately no `authorizePage`: each entry type keeps the read rule of its
 * source, and the seasonal entries need no permission.
 */
export default async function Page({
  searchParams,
}: PageProps<"/app/calendar">) {
  const authentication = await requireAuthenticationPage("/app/calendar");

  const [settings, page] = await Promise.all([
    getMyCalendarEntryTypeSettings(),
    loadCalendarPage(searchParams),
  ]);

  return (
    <SidebarLayout
      sidebar={
        <CalendarFilters
          settings={settings}
          canSaveSettings={Boolean(authentication.session.entity)}
        />
      }
      childrenContainerClassName="@container/main"
    >
      <div className="@container/events max-w-100 @4xl/main:max-w-none">
        <SuspenseWithErrorBoundaryTile>
          <CalendarDayList page={page} />
        </SuspenseWithErrorBoundaryTile>
      </div>
    </SidebarLayout>
  );
}
