import { requireAuthenticationPage } from "@/modules/auth/server";
import { AvatarCreatorClient } from "@/modules/avatar-creator/components/AvatarCreatorClient";

export default async function Page() {
  await requireAuthenticationPage("/app/avatar-creator");

  return <AvatarCreatorClient />;
}
