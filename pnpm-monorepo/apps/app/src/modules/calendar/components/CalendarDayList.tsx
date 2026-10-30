import "server-only";

import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { toLocalDateKey } from "@sam-monorepo/domain";
import clsx from "clsx";
import { getCalendarEntries } from "../queries/getCalendarEntries";
import type { CalendarPage } from "../utils/calendarRange";
import { CalendarDayHeadingLevel, CalendarDays } from "./CalendarDays";

interface Props {
  readonly className?: string;
  readonly page: CalendarPage;
}

/** Each day of the page with its entries, and the pagination */
export const CalendarDayList = async ({ className, page }: Props) => {
  const entries = await getCalendarEntries(
    toLocalDateKey(page.range.start),
    toLocalDateKey(page.range.end),
    false,
  );

  return (
    <div className={clsx("flex flex-col", className)}>
      <CalendarDays
        entries={entries}
        days={page.days}
        headingLevel={CalendarDayHeadingLevel.Page}
      />

      <CursorPaginationControls
        nextCursor={page.nextCursor}
        prevCursor={page.prevCursor}
        className="mt-6"
      />
    </div>
  );
};
