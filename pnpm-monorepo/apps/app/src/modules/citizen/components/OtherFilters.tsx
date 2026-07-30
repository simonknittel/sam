import { entityLogTypeTranslations } from "@/modules/common/utils/entityLogTypeTranslations";
import { Filter } from "@/modules/spynet/components/Filter";
import type { EntityLogType } from "@/types";
import { ConfirmationStateFilter } from "./ConfirmationStateFilter";
import { EntityLogTypeFilter } from "./EntityLogTypeFilter";
import { type Row } from "./OtherTable";

interface Props {
  readonly rows: Row[];
}

export const OtherFilters = ({ rows }: Props) => {
  const confirmationStates = new Set<string>();
  const entityLogTypes = new Map<EntityLogType, string>();

  for (const row of rows) {
    if (row.confirmationState) {
      confirmationStates.add(row.confirmationState);
    } else {
      confirmationStates.add("unconfirmed");
    }

    if (row.entityLog.type) {
      entityLogTypes.set(
        row.entityLog.type as EntityLogType,
        entityLogTypeTranslations[row.entityLog.type],
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

      {entityLogTypes.size > 0 && (
        <Filter name="Merkmal">
          <EntityLogTypeFilter entityLogTypes={entityLogTypes} />
        </Filter>
      )}
    </div>
  );
};
