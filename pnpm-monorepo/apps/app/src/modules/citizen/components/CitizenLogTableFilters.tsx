import {
  CITIZEN_LOG_TABLE_CONFIRMATION_PARAM,
  CITIZEN_LOG_TABLE_DEFAULT_SORT,
} from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import type { ConfirmationStatus } from "@sam-monorepo/database/client";
import {
  CitizenLogTableSort,
  ConfirmationValue,
  toConfirmationValue,
} from "@sam-monorepo/domain";

const CONFIRMATION_LABELS: Record<ConfirmationValue, string> = {
  [ConfirmationValue.Unconfirmed]: "Unbestätigt",
  [ConfirmationValue.Confirmed]: "Bestätigt",
  [ConfirmationValue.FalseReport]: "Falschmeldung",
};

const SORT_ITEMS = [
  /** The filter selects the first item while the URL has no sort */
  { value: CITIZEN_LOG_TABLE_DEFAULT_SORT, label: "Eingereicht am ↓" },
  { value: CitizenLogTableSort.CreatedAtAscending, label: "Eingereicht am ↑" },
  { value: CitizenLogTableSort.ConfirmedAtDescending, label: "Bestätigt am ↓" },
  { value: CitizenLogTableSort.ConfirmedAtAscending, label: "Bestätigt am ↑" },
];

interface Props {
  readonly confirmationStates: readonly (ConfirmationStatus | null)[];
}

export const CitizenLogTableFilters = ({ confirmationStates }: Props) => {
  const confirmationValues = new Set(
    confirmationStates.map(toConfirmationValue),
  );
  const confirmationItems = Object.values(ConfirmationValue)
    .filter((value) => confirmationValues.has(value))
    .map((value) => ({ value, label: CONFIRMATION_LABELS[value] }));

  return (
    <>
      {confirmationItems.length > 0 && (
        <MultiSelectComboboxFilter
          name={CITIZEN_LOG_TABLE_CONFIRMATION_PARAM}
          label="Bestätigungsstatus"
          items={confirmationItems}
          resetCursorPagination
        />
      )}

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={SORT_ITEMS}
        resetCursorPagination
      />
    </>
  );
};
