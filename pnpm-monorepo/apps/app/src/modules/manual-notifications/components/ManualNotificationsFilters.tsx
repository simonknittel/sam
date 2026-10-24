import { DateRangeFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/DateRangeFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import {
  MANUAL_NOTIFICATIONS_FROM_PARAM,
  MANUAL_NOTIFICATIONS_SEARCH_PARAM,
  MANUAL_NOTIFICATIONS_TO_PARAM,
} from "../utils/manualNotificationFilterParams";

export const ManualNotificationsFilters = () => {
  return (
    <>
      <TextSearchFilter
        name={MANUAL_NOTIFICATIONS_SEARCH_PARAM}
        label="Suche"
        placeholder="Titel oder Text..."
        resetCursorPagination
      />

      <DateRangeFilter
        fromName={MANUAL_NOTIFICATIONS_FROM_PARAM}
        toName={MANUAL_NOTIFICATIONS_TO_PARAM}
        label="Zeitraum"
        resetCursorPagination
      />
    </>
  );
};
