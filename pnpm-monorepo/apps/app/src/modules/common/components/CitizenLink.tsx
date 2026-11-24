"use client";

import { useIsOwnCitizen } from "@/modules/auth/hooks/useIsOwnCitizen";
import { useHasBirthdayToday } from "@/modules/citizen/components/BirthdayCitizensProvider";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import type { Citizen } from "@sam-monorepo/database/browser";
import { DELETED_CITIZEN_LABEL } from "@sam-monorepo/domain";
import clsx from "clsx";
import { BirthdayHat } from "./BirthdayHat";
import { CitizenAvatarSize } from "./CitizenAvatarSize";
import { CitizenLinkAvatar } from "./CitizenLinkAvatar";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  /**
   * A deleted citizen shows as "Gelöschter Citizen", without a link. Without
   * `deletedAt`, the citizen is not deleted.
   */
  readonly citizen?:
    | (Pick<Citizen, "id" | "handle"> & {
        readonly deletedAt?: Citizen["deletedAt"];
      })
    | null;
  readonly page?: string;
  readonly avatarSize?: CitizenAvatarSize;
}

export const CitizenLink = ({
  className,
  citizen,
  page = "",
  avatarSize = CitizenAvatarSize.Text,
}: Props) => {
  const isOwnCitizen = useIsOwnCitizen(citizen?.id);
  const hasBirthdayToday = useHasBirthdayToday(citizen?.id);

  if (!citizen) return <span className="text-neutral-500">Unbekannt</span>;

  if (citizen.deletedAt)
    return <span className="text-neutral-500">{DELETED_CITIZEN_LABEL}</span>;

  return (
    <CitizenPopover citizenId={citizen.id}>
      <Link
        href={`/app/spynet/citizen/${citizen.id}${page}`}
        className={clsx(
          "hover:underline",
          {
            /** The birthday of a citizen outranks both other colours */
            "text-birthday": hasBirthdayToday,
            "text-me": !hasBirthdayToday && isOwnCitizen,
            "text-interaction-500": !hasBirthdayToday && !isOwnCitizen,
          },
          className,
        )}
        prefetch={false}
        /* For the link colour of the wiki, which outranks `text-me` */
        data-own-citizen={!hasBirthdayToday && isOwnCitizen ? "" : undefined}
      >
        <CitizenLinkAvatar citizenId={citizen.id} size={avatarSize} />
        {citizen.handle || citizen.id}
      </Link>

      {hasBirthdayToday && (
        <BirthdayHat
          /* The ink of the hat sits above the middle of its box, thus the
          box goes one pixel below the middle of the text. */
          className="ml-1 inline-block size-4 -translate-y-px align-middle"
        />
      )}
    </CitizenPopover>
  );
};
