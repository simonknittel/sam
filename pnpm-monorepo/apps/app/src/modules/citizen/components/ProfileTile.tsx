import { requireAuthentication } from "@/modules/auth/server";
import { Link } from "@/modules/common/components/Link";
import { forbidden } from "next/navigation";
import { getCitizenProfile } from "../queries/getCitizenProfile";
import { ProfileContent } from "./ProfileContent";

export const ProfileTile = async () => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) forbidden();

  const profile = await getCitizenProfile(authentication.session.entity.id);
  if (!profile) throw new Error("The citizen of the session does not exist");

  return (
    <div className="flex flex-col gap-0.5 items-center">
      <section className="p-4 bg-secondary w-full corners-primary">
        <ProfileContent profile={profile} />
      </section>

      {profile.canOpenSpynet && (
        <Link
          href={`/app/spynet/citizen/${profile.citizen.id}`}
          className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-sm mt-2"
        >
          Vollständiges Profil
        </Link>
      )}
    </div>
  );
};
