import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { Filter } from "@/modules/common/components/Filter";
import type { CitizenLogType } from "@/types";
import { CitizenLogTypeFilter } from "./CitizenLogTypeFilter";
import { ConfirmationStateFilter } from "./ConfirmationStateFilter";
import { type Row } from "./OtherTable";

interface Props {
  readonly rows: Row[];
}

export const OtherFilters = ({ rows }: Props) => {
  const confirmationStates = new Set<string>();
  const citizenLogTypes = new Map<CitizenLogType, string>();

  for (const row of rows) {
    if (row.confirmationState) {
      confirmationStates.add(row.confirmationState);
    } else {
      confirmationStates.add("unconfirmed");
    }

    if (row.citizenLog.type) {
      citizenLogTypes.set(
        row.citizenLog.type as CitizenLogType,
        citizenLogTypeTranslations[row.citizenLog.type],
      );
    }
  }
  return (
    <div className="flex gap-2 items-center">
      {confirmationStates.size > 0 && (
        <Filter name="Bestätigungsstatus">
          <ConfirmationStateFilter
            confirmationStates={Array.from(confirmationStates)}
          />
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
