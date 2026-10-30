import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import type { CalendarEntryTypeSetting } from "@sam-monorepo/application";
import { CALENDAR_FROM_PARAM, CALENDAR_TO_PARAM } from "../utils/calendarRange";
import { CalendarTypeFilter } from "./CalendarTypeFilter";

interface Props {
  readonly settings: readonly CalendarEntryTypeSetting[];
  readonly canSaveSettings: boolean;
}

/**
 * The date range stays in the URL only. The type selection is saved for the
 * citizen.
 */
export const CalendarFilters = ({ settings, canSaveSettings }: Props) => (
  <>
    <DateRangeFilter
      fromName={CALENDAR_FROM_PARAM}
      toName={CALENDAR_TO_PARAM}
      label="Zeitraum"
    />

    <CalendarTypeFilter settings={settings} canSave={canSaveSettings} />
  </>
);
