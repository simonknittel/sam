import { Link } from "@/modules/common/components/Link";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { toLocalDateKey } from "@sam-monorepo/domain";
import clsx from "clsx";
import { getCalendarEntries } from "../queries/getCalendarEntries";
import {
  DASHBOARD_CALENDAR_DAY_COUNT,
  getDashboardCalendarRange,
} from "../utils/calendarRange";
import { CalendarEntryItem } from "./CalendarEntryItem";
import { CalendarEntryDateStyle } from "./CalendarEntryRow";

interface Props {
  readonly className?: string;
}

/**
 * The entries of the next days (see `DASHBOARD_CALENDAR_DAY_COUNT`) and the
 * events that run now, as one flat list without a limit. The type filter of
 * the calendar app applies.
 */
export const CalendarTile = async ({ className }: Props) => {
  const { start, end } = getDashboardCalendarRange();
  const entries = await getCalendarEntries(
    toLocalDateKey(start),
    toLocalDateKey(end),
    true,
  );

  return (
    <section
      className={clsx(
        "flex flex-col items-center gap-0.5 @4xl/events:overflow-hidden",
        className,
      )}
      data-onboarding-target={OnboardingTargetId.DashboardCalendar}
    >
      <h2 className="mb-2 w-full font-mono text-2xl font-thin uppercase">
        Kalender
      </h2>

      {entries.length > 0 ? (
        entries.map((entry, index) => (
          <CalendarEntryItem
            key={entry.key}
            entry={entry}
            index={index}
            dateStyle={CalendarEntryDateStyle.DayAndTime}
          />
        ))
      ) : (
        <div className="w-full corners-secondary bg-secondary p-4">
          <p>
            In den nächsten {DASHBOARD_CALENDAR_DAY_COUNT} Tagen stehen keine
            Termine an.
          </p>
        </div>
      )}

      <Link
        href="/app/calendar"
        className="mt-2 font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline"
      >
        Zum Kalender
      </Link>
    </section>
  );
};
