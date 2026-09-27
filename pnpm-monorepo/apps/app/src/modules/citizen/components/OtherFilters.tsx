import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { Filter } from "@/modules/common/components/Filter";
import type { CitizenLogType } from "@/types";
import type { ConfirmationStatus } from "@sam-monorepo/database/client";
import { CitizenLogTypeFilter } from "./CitizenLogTypeFilter";
import { ConfirmationStateFilter } from "./ConfirmationStateFilter";

interface Props {
  readonly confirmationStates: readonly (ConfirmationStatus | null)[];
  readonly types: readonly CitizenLogType[];
}

export const OtherFilters = ({ confirmationStates, types }: Props) => {
  const citizenLogTypes = new Map<CitizenLogType, string>(
    types.map((type) => [type, citizenLogTypeTranslations[type]]),
  );

  return (
    <div className="flex gap-2 items-center">
      {confirmationStates.length > 0 && (
        <Filter name="Bestätigungsstatus">
          <ConfirmationStateFilter confirmationStates={confirmationStates} />
        </Filter>
      )}

      {citizenLogTypes.size > 0 && (
        <Filter name="Merkmal">
          <CitizenLogTypeFilter citizenLogTypes={citizenLogTypes} />
        </Filter>
      )}
    </div>
  );
};
