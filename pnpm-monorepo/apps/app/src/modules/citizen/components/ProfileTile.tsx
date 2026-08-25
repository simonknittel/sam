import { requireAuthentication } from "@/modules/auth/server";
import { forbidden } from "next/navigation";
import { getCitizenProfile } from "../queries/getCitizenProfile";
import { ProfileContent } from "./ProfileContent";

export const ProfileTile = async () => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) forbidden();

  const profile = await getCitizenProfile(authentication.session.entity.id);
  if (!profile) throw new Error("The citizen of the session does not exist");

  return (
    <section className="p-4 bg-secondary w-full corners-primary">
      <ProfileContent profile={profile} />
    </section>
  );
};
