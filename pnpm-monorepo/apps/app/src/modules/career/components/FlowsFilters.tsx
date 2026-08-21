import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import {
  FLOW_QUERY_PARAM,
  FLOW_STATUS_PARAM,
  FlowStatus,
} from "../utils/flowFilterParams";

export const FlowsFilters = () => {
  return (
    <>
      <TextSearchFilter
        name={FLOW_QUERY_PARAM}
        label="Name oder Slug"
        placeholder="Suche..."
      />

      <RadioFilter
        name={FLOW_STATUS_PARAM}
        label="Status"
        items={[
          { value: FlowStatus.Active, label: "Aktiv", default: true },
          { value: FlowStatus.Deleted, label: "Gelöscht" },
          { value: FlowStatus.All, label: "Alle" },
        ]}
      />
    </>
  );
};
