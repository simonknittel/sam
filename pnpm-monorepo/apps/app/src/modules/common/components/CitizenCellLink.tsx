"use client";

import { useIsOwnCitizen } from "@/modules/auth/hooks/useIsOwnCitizen";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import type { Citizen } from "@sam-monorepo/database/browser";
import {
  DELETED_CITIZEN_LABEL,
  getCitizenDisplayName,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { CitizenAvatarSize } from "./CitizenAvatarSize";
import { CitizenLinkAvatar } from "./CitizenLinkAvatar";
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
  /** The Discord avatar in front of the name */
  readonly avatarSize?: CitizenAvatarSize;
}

/**
 * A citizen in a table cell. The link fills the cell, thus the full cell
 * reacts to the pointer. For a citizen in a text, use `CitizenLink`.
 */
export const CitizenCellLink = ({
  className,
  citizen,
  page = "",
  avatarSize = CitizenAvatarSize.Row,
}: Props) => {
  const isOwnCitizen = useIsOwnCitizen(citizen?.id);

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
          "flex items-center rounded-secondary px-2 hover:bg-white/10 focus-visible:bg-white/10 active:bg-white/15",
          {
            "text-me": isOwnCitizen,
            "text-brand-red-500": !isOwnCitizen,
          },
          className,
        )}
        prefetch={false}
        title={name}
      >
        <CitizenLinkAvatar citizenId={citizen.id} size={avatarSize} />
        <span className="truncate">{name}</span>
      </Link>
    </CitizenPopover>
  );
};
