import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import {
  DELETED_CITIZEN_LABEL,
  getCitizenDisplayName,
} from "@/modules/citizen/utils/citizenDisplayName";
import type { Citizen } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { Link } from "./Link";

interface Props {
  /** For the link and for the text without a link, for example the height */
  readonly className?: string;
  /**
   * NULL shows "Unbekannt". A deleted citizen shows "Deleted citizen" without
   * a link.
   */
  readonly citizen: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
  /** A sub page of the citizen, for example "/notes" */
  readonly page?: string;
}

/**
 * A citizen in a table cell. The link fills the cell, thus the full cell
 * reacts to the pointer. For a citizen in a text, use `CitizenLink`.
 */
export const CitizenCellLink = ({ className, citizen, page = "" }: Props) => {
  if (!citizen || citizen.deletedAt) {
    const label = citizen ? DELETED_CITIZEN_LABEL : "Unbekannt";

    return (
      <span
        className={clsx(
          "flex items-center px-2 text-neutral-500",
          { italic: !citizen },
          className,
        )}
        title={label}
      >
        <span className="truncate">{label}</span>
      </span>
    );
  }

  const name = getCitizenDisplayName(citizen);

  return (
    <CitizenPopover citizenId={citizen.id}>
      <Link
        href={`/app/spynet/citizen/${citizen.id}${page}`}
        className={clsx(
          "flex items-center rounded-secondary px-2 text-brand-red-500 hover:bg-white/10 focus-visible:bg-white/10 active:bg-white/15",
          className,
        )}
        prefetch={false}
        title={name}
      >
        <span className="truncate">{name}</span>
      </Link>
    </CitizenPopover>
  );
};
