"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { useHasBirthdayToday } from "@/modules/citizen/components/BirthdayCitizensProvider";
import { CitizenPopover } from "@/modules/citizen/components/CitizenPopover";
import { DELETED_CITIZEN_LABEL } from "@/modules/citizen/utils/citizenDisplayName";
import type { Citizen } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { BirthdayHat } from "./BirthdayHat";
import { Link } from "./Link";

interface Props {
  readonly className?: string;
  /** A deleted citizen shows as "Deleted citizen", without a link */
  readonly citizen?: Pick<Citizen, "id" | "handle" | "deletedAt"> | null;
  readonly page?: string;
}

export const CitizenLink = ({ className, citizen, page = "" }: Props) => {
  const authentication = useAuthentication();
  const isCitizenCurrentUser =
    authentication && authentication.session.entity && citizen
      ? citizen.id === authentication.session.entity.id
      : false;

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
            "text-me": !hasBirthdayToday && isCitizenCurrentUser,
            "text-interaction-500": !hasBirthdayToday && !isCitizenCurrentUser,
          },
          className,
        )}
        prefetch={false}
      >
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
