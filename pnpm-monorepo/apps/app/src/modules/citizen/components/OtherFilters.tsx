import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CITIZEN_LOG_TABLE_TYPE_PARAM } from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { MultiSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/MultiSelectComboboxFilter";
import { findIdentityLogTableFilterOptions } from "@sam-monorepo/application";
import { CitizenLogTableFilters } from "./CitizenLogTableFilters";

export const OtherFilters = async () => {
  const options = await findIdentityLogTableFilterOptions(
    getApplicationContext(),
    await getRequestActor(),
  ).catch(throwApplicationErrorForPage);

  return (
    <>
      {options.types.length > 0 && (
        <MultiSelectComboboxFilter
          name={CITIZEN_LOG_TABLE_TYPE_PARAM}
          label="Merkmal"
          items={options.types.map((type) => ({
            value: type,
            label: citizenLogTypeTranslations[type],
          }))}
          resetCursorPagination
        />
      )}

      <CitizenLogTableFilters confirmationStates={options.confirmationStates} />
    </>
  );
};
