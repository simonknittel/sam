import { ActivityTable } from "@/modules/activity/components/ActivityTable";
import {
  ACTIVITY_PAGE_SIZE,
  ActivityColumn,
  type ActivitySource,
} from "@/modules/activity/utils/activityEntry";
import {
  activityFilterParsers,
  getActivityFilters,
  hasActiveActivityFilters,
} from "@/modules/activity/utils/activityFilterParams";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { paginateMergedSources } from "@/modules/common/CursorPagination/mergedCursor";
import { EventActivityType, type Event } from "@sam-monorepo/database/client";
import type { SearchParams } from "nuqs/server";
import {
  createEventActivitySource,
  createEventScheduleSource,
} from "../activity/eventActivitySources";
import { EventActivitySourceKey } from "../activity/eventActivityTypes";

const loadSearchParams = createCursorPaginationLoader(activityFilterParsers);

interface Props {
  readonly className?: string;
  readonly event: Event;
  readonly searchParams: Promise<SearchParams>;
}

export const EventActivityTable = async ({
  className,
  event,
  searchParams,
}: Props) => {
  const searchParameters = await loadSearchParams(searchParams);
  const filters = getActivityFilters(searchParameters);

  const selectsStoredTypes =
    !filters.types ||
    filters.types.some((type) =>
      Object.values(EventActivityType).includes(type as EventActivityType),
    );
  const selectsSchedule =
    !filters.types || filters.types.includes(EventActivitySourceKey.Schedule);

  const sources: ActivitySource[] = [
    ...(selectsStoredTypes
      ? [createEventActivitySource({ eventId: event.id, filters })]
      : []),
    ...(selectsSchedule ? [createEventScheduleSource({ event, filters })] : []),
  ];

  const { entries, nextCursor, prevCursor } = await paginateMergedSources({
    sources,
    pageSize: ACTIVITY_PAGE_SIZE,
    cursor: searchParameters.cursor,
    direction: searchParameters.direction,
  });

  return (
    <ActivityTable
      className={className}
      heading="Aktivität"
      entries={entries}
      columns={[ActivityColumn.Actor, ActivityColumn.Target]}
      emptyMessage={
        hasActiveActivityFilters(filters)
          ? "Keine Aktivität für diese Filter."
          : "Bisher gibt es keine Aktivität."
      }
      nextCursor={nextCursor}
      prevCursor={prevCursor}
    />
  );
};
