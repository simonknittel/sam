import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import type { CalendarEntryTypeSetting } from "@sam-monorepo/application";
import { toLocalDateKey, type LocalDateRange } from "@sam-monorepo/domain";
import { CALENDAR_FROM_PARAM, CALENDAR_TO_PARAM } from "../utils/calendarRange";
import { CalendarTypeFilter } from "./CalendarTypeFilter";

interface Props {
  /** The range that the list shows, also when the URL has no bounds */
  readonly range: LocalDateRange;
  readonly settings: readonly CalendarEntryTypeSetting[];
  readonly canSaveSettings: boolean;
}

/**
 * The date range stays in the URL only. The type selection is saved for the
 * citizen.
 */
export const CalendarFilters = ({
  range,
  settings,
  canSaveSettings,
}: Props) => (
  <>
    <DateRangeFilter
      fromName={CALENDAR_FROM_PARAM}
      toName={CALENDAR_TO_PARAM}
      label="Zeitraum"
      defaultFrom={toLocalDateKey(range.start)}
      defaultTo={toLocalDateKey(range.end)}
    />

    <CalendarTypeFilter settings={settings} canSave={canSaveSettings} />
  </>
);
