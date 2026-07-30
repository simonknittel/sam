import { requireAuthenticationPage } from "@/modules/auth/server";
import { TimezonesClientLoader } from "@/modules/timezones/components/TimezonesClientLoader";

export default async function Page() {
  await requireAuthenticationPage("/app/changelog");

  return <TimezonesClientLoader />;
}
