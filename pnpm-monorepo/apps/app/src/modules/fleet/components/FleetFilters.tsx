import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { TextSearchFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/TextSearchFilter";
import {
  ShipAcquisitionSource,
  type Manufacturer,
} from "@sam-monorepo/database/browser";
import type { VariantTagBadgeItem } from "../queries/shipQuery";
import {
  ACQUISITION_SOURCE_LABEL,
  UNKNOWN_ACQUISITION_SOURCE_LABEL,
} from "../utils/acquisitionSourceLabel";
import {
  AcquisitionSourceParameter,
  FleetSortParameter,
  FlightReadyParameter,
  ShowDeletedParameter,
} from "../utils/fleetSearchParameters";

interface Props {
  readonly variantTags: readonly VariantTagBadgeItem[];
  readonly manufacturers: Manufacturer[];
  /** Ship lists offer filtering by deleted ships; the org's variant list has none */
  readonly showDeletedFilter?: boolean;
  /** The org's variant list can additionally sort by ship count */
  readonly withCountSort?: boolean;
}

export const FleetFilters = ({
  variantTags,
  manufacturers,
  showDeletedFilter = false,
  withCountSort = false,
}: Props) => {
  const tagItems = variantTags.map((tag) => ({
    value: tag.id,
    label: tag.value,
    group: tag.key,
  }));

  const manufacturerItems = manufacturers.map((manufacturer) => ({
    value: manufacturer.id,
    label: manufacturer.name,
  }));

  return (
    <>
      <TextSearchFilter label="Name" resetCursorPagination />

      <RadioFilter
        name="flight_ready"
        label="Flight ready"
        items={[
          { value: FlightReadyParameter.All, label: "Alle", default: true },
          { value: FlightReadyParameter.FlightReady, label: "Flight ready" },
        ]}
        resetCursorPagination
      />

      <SingleSelectComboboxFilter
        name="acquisition_source"
        label="Herkunft"
        items={[
          { value: AcquisitionSourceParameter.All, label: "Alle" },
          {
            value: AcquisitionSourceParameter.Store,
            label: ACQUISITION_SOURCE_LABEL[ShipAcquisitionSource.STORE],
          },
          {
            value: AcquisitionSourceParameter.InGame,
            label: ACQUISITION_SOURCE_LABEL[ShipAcquisitionSource.IN_GAME],
          },
          {
            value: AcquisitionSourceParameter.Unknown,
            label: UNKNOWN_ACQUISITION_SOURCE_LABEL,
          },
        ]}
        resetCursorPagination
      />

      {showDeletedFilter && (
        <RadioFilter
          name="showDeleted"
          label="Status"
          items={[
            { value: ShowDeletedParameter.All, label: "Alle", default: true },
            { value: ShowDeletedParameter.Deleted, label: "Gelöscht" },
          ]}
          resetCursorPagination
        />
      )}

      <MultiSelectComboboxFilter
        name="variantTags"
        label="Tags"
        items={tagItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <MultiSelectComboboxFilter
        name="manufacturerIds"
        label="Hersteller"
        items={manufacturerItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: FleetSortParameter.NameAscending, label: "Name A - Z" },
          { value: FleetSortParameter.NameDescending, label: "Name Z - A" },
          ...(withCountSort
            ? [
                {
                  value: FleetSortParameter.CountDescending,
                  label: "Anzahl ↓",
                },
                {
                  value: FleetSortParameter.CountAscending,
                  label: "Anzahl ↑",
                },
              ]
            : []),
        ]}
        resetCursorPagination
      />
    </>
  );
};
