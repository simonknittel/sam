import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const EventFilters = () => {
  return (
    <>
      <RadioFilter
        name="status"
        label="Status"
        items={[
          { value: "open", label: "Offen", default: true },
          { value: "closed", label: "Geschlossen" },
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
    </>
  );
};
