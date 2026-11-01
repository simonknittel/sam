import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { SilcBalanceSort } from "../utils/silcBalanceSort";

export const SilcBalancesFilters = () => {
  return (
    <SingleSelectComboboxFilter
      name="sort"
      label="Sortierung"
      /** The first item is the default of the table */
      items={[
        { value: SilcBalanceSort.BalanceDescending, label: "Kontostand ↓" },
        { value: SilcBalanceSort.BalanceAscending, label: "Kontostand ↑" },
        { value: SilcBalanceSort.TotalEarnedDescending, label: "Verdient ↓" },
        { value: SilcBalanceSort.TotalEarnedAscending, label: "Verdient ↑" },
        { value: SilcBalanceSort.HandleAscending, label: "Citizen A - Z" },
        { value: SilcBalanceSort.HandleDescending, label: "Citizen Z - A" },
      ]}
    />
  );
};
