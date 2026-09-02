import { requireAuthentication } from "@/modules/auth/server";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { getCitizenProfile } from "../queries/getCitizenProfile";
import { ProfileContent } from "./ProfileContent";

export const ProfileTile = async () => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) forbidden();

  const profile = await getCitizenProfile(authentication.session.entity.id);
  if (!profile) throw new Error("The citizen of the session does not exist");

  return (
    <section
      className={clsx("p-4 bg-secondary w-full corners-primary", {
        /** The whole tile celebrates with the citizen: the colour clouds of
        the surface, and an isolated box for the confetti behind the
        profile. */
        "background-birthday relative isolate":
          profile.citizen.hasBirthdayToday,
      })}
    >
      <ProfileContent profile={profile} />
    </section>
  );
};
