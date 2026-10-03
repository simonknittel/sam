import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";

export const ProfitDistributionCycleSidebar = () => {
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

      <div className="corners-secondary bg-secondary p-2">
        <p className="text-sm text-neutral-500">Sortierung</p>

        <p className="text-sm">Ende der Sammelphase (absteigend)</p>
      </div>
    </>
  );
};
