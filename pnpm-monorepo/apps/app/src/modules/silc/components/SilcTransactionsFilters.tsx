import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const SilcTransactionsFilters = () => {
  return (
    <>
      <RadioFilter
        name="showDeleted"
        label="Transaktionen"
        items={[
          { value: "alle", label: "Alle", default: true },
          { value: "deleted", label: "Gelöscht" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
