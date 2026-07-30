import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const Filters = () => {
  return (
    <>
      <RadioFilter
        name="status"
        label="Status"
        items={[
          { value: "active", label: "Aktiv", default: true },
          { value: "inactive", label: "Inaktiv" },
          { value: "deleted", label: "Gelöscht" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
