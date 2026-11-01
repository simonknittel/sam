import { requireAuthenticationPage } from "@/modules/auth/server";
import { citizenLogTypeTranslations } from "@/modules/citizen/utils/citizenLogTypeTranslations";
import { Actions } from "@/modules/common/components/Actions";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { CitizenLogTableRow } from "@sam-monorepo/application";
import { CitizenLogAuthorCell } from "./CitizenLogAuthorCell";
import { ConfirmationState } from "./ConfirmationState";
import { OtherTableDelete } from "./OtherTableDelete";

interface Props {
  readonly log: CitizenLogTableRow;
}

export const OtherTableRow = ({ log }: Props) => {
  return (
    <TRow>
      <td className="min-w-0">
        <CitizenCellLink className="h-8" citizen={log.citizen} />
      </td>

      <td className="truncate" title={citizenLogTypeTranslations[log.type]}>
        {citizenLogTypeTranslations[log.type]}
      </td>

      <td className="truncate" title={log.content || undefined}>
        {log.content}
      </td>

      <td className="min-w-0">
        <ConfirmationState
          citizenLog={{
            id: log.id,
            citizenId: log.citizenId,
            confirmed: log.confirmed,
            citizen: { deletedAt: log.citizen.deletedAt },
          }}
          /**
           * The table shows a log without a decision only to a viewer with
           * the permission to confirm the logs of its type (see
           * getReadableCitizenLogWhere)
           */
          canDecide={true}
        />
      </td>

      <td className="truncate">{formatDate(log.confirmedAt)}</td>

      <CitizenLogAuthorCell author={log.confirmedBy} />

      <td className="truncate">{formatDate(log.createdAt)}</td>

      <CitizenLogAuthorCell author={log.submittedBy} fallback="Unbekannt" />

      <td>
        <OtherTableActions log={log} />
      </td>
    </TRow>
  );
};

/**
 * The delete button of the log, with the permission check of the delete
 * action
 */
const OtherTableActions = async ({ log }: Props) => {
  /** The logs of a deleted citizen are read only */
  if (log.citizen.deletedAt) return null;

  switch (log.type) {
    case "handle":
    case "teamspeak-id":
    case "discord-id":
    case "citizen-id":
    case "community-moniker": {
      const authentication = await requireAuthenticationPage();
      if (!(await authentication.authorize(log.type, "delete"))) return null;

      return (
        <Actions>
          <OtherTableDelete log={{ id: log.id }} />
        </Actions>
      );
    }

    /** The other types, for example the Spectrum ID: nobody can delete them */
    default:
      return null;
  }
};
