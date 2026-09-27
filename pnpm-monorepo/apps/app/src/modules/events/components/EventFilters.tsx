import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { EventListStatus } from "../utils/EventListStatus";

export const EventFilters = () => {
  return (
    <>
      <RadioFilter
        name="status"
        label="Status"
        items={[
          { value: EventListStatus.Open, label: "Offen", default: true },
          { value: EventListStatus.New, label: "Neu" },
          { value: EventListStatus.Closed, label: "Geschlossen" },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name="participating"
        label="Zugesagt von"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "me", label: "Mir" },
        ]}
        resetCursorPagination
      />

      <RadioFilter
        name="type"
        label="Typ"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "app", label: "App" },
          { value: "discord", label: "Discord" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
