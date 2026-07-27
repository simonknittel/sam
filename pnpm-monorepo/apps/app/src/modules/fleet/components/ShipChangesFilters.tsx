import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const ShipChangesFilters = () => {
  return (
    <>
      <RadioFilter
        name="changeType"
        label="Typ"
        items={[
          { value: "both", label: "Alle", default: true },
          { value: "creation", label: "Erstellt" },
          { value: "deletion", label: "Gelöscht" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
