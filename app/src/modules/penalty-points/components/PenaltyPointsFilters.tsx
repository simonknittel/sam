"use client";

import { RadioFilter } from "@/modules/common/components/SidebarFilters/RadioFilter";

export const PenaltyPointsFilters = () => {
  return (
    <RadioFilter
      name="expired"
      label="Status"
      items={[
        { value: "active", label: "Aktiv", default: true },
        { value: "all", label: "Alle" },
      ]}
    />
  );
};
