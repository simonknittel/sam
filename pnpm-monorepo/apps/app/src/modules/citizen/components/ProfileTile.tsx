import type { Citizen } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { getCitizenProfile } from "../queries/getCitizenProfile";
import { ProfileContent } from "./ProfileContent";

interface Props {
  readonly className?: string;
  readonly citizenId: Citizen["id"];
  /** On the Spynet page of the citizen, the link would open the same page */
  readonly hideSpynetLink?: boolean;
}

export const ProfileTile = async ({
  className,
  citizenId,
  hideSpynetLink,
}: Props) => {
  const profile = await getCitizenProfile(citizenId);
  if (!profile) throw new Error("The citizen does not exist");

  return (
    <section
      className={clsx(
        "w-full corners-primary bg-secondary p-4",
        {
          /** The whole tile celebrates with the citizen: the colour clouds
          of the surface, and an isolated box for the confetti behind the
          profile. */
          "relative isolate background-birthday":
            profile.citizen.hasBirthdayToday,
        },
        className,
      )}
    >
      <ProfileContent profile={profile} hideSpynetLink={hideSpynetLink} />
    </section>
  );
};
