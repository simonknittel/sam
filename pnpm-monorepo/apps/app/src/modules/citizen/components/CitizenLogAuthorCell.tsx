import { CitizenAvatarSize } from "@/modules/common/components/CitizenAvatarSize";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import type { CitizenLogTableRow } from "@sam-monorepo/application";
import {
  DELETED_CITIZEN_LABEL,
  getCitizenDisplayName,
} from "@sam-monorepo/domain";

type Author = CitizenLogTableRow["submittedBy"];

/** A deleted citizen shows only the label, never its handle */
const getAuthorName = (author: Author) => {
  if (author?.citizen) {
    return author.citizen.deletedAt
      ? DELETED_CITIZEN_LABEL
      : getCitizenDisplayName(author.citizen);
  }

  return author?.name ?? undefined;
};

interface Props {
  /** The login that submitted or confirmed the log */
  readonly author: Author;
  readonly fallback?: string;
}

export const CitizenLogAuthorCell = ({ author, fallback }: Props) => {
  const name = getAuthorName(author) ?? fallback;

  return (
    <td className="truncate" title={name}>
      {author?.citizen ? (
        <CitizenLink
          citizen={author.citizen}
          avatarSize={CitizenAvatarSize.Row}
        />
      ) : (
        name
      )}
    </td>
  );
};
