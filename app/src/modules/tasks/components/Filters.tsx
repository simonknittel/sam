import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const Filters = () => {
  return (
    <>
      <RadioFilter
        name="status"
        label="Status"
        items={[
          { value: "open", label: "Offen", default: true },
          { value: "closed", label: "Geschlossen" },
        ]}
      />

      <RadioFilter
        name="accepted"
        label="Angenommen von"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "yes", label: "Mir" },
        ]}
      />

      <RadioFilter
        name="created_by"
        label="Erstellt von"
        items={[
          { value: "others", label: "Alle", default: true },
          { value: "me", label: "Mir" },
        ]}
      />
    </>
  );
};
