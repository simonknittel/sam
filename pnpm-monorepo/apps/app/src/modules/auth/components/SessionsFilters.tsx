import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import {
  SESSION_SORT_PARAM,
  SESSION_STATUS_PARAM,
  SessionSort,
  SessionStatus,
} from "../utils/sessionFilterParams";

export const SessionsFilters = () => {
  return (
    <>
      <RadioFilter
        name={SESSION_STATUS_PARAM}
        label="Status"
        items={[
          { value: SessionStatus.Active, label: "Aktiv", default: true },
          { value: SessionStatus.Expired, label: "Abgelaufen" },
          { value: SessionStatus.All, label: "Alle" },
        ]}
      />

      <SingleSelectComboboxFilter
        name={SESSION_SORT_PARAM}
        label="Sortierung"
        items={[
          { value: SessionSort.NewestFirst, label: "Neueste zuerst" },
          { value: SessionSort.OldestFirst, label: "Älteste zuerst" },
        ]}
      />
    </>
  );
};
