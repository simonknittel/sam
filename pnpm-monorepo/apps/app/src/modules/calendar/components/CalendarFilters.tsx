import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import type { CalendarEntryTypeSetting } from "@sam-monorepo/application";
import { CalendarListStatus } from "../utils/calendarRange";
import { CalendarTypeFilter } from "./CalendarTypeFilter";

interface Props {
  readonly settings: readonly CalendarEntryTypeSetting[];
  readonly canSaveSettings: boolean;
}

/** The status stays in the URL only. The type selection is saved for the citizen. */
export const CalendarFilters = ({ settings, canSaveSettings }: Props) => (
  <>
    <RadioFilter
      name="status"
      label="Status"
      items={[
        { value: CalendarListStatus.Upcoming, label: "Kommend", default: true },
        { value: CalendarListStatus.Past, label: "Vergangen" },
      ]}
      resetCursorPagination
    />

    <CalendarTypeFilter settings={settings} canSave={canSaveSettings} />
  </>
);
