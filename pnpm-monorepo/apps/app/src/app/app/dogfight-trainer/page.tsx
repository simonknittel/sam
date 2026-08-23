import { requireAuthenticationPage } from "@/modules/auth/server";
import { IframeLayout } from "@/modules/common/components/layouts/IframeLayout";

export default async function Page() {
  await requireAuthenticationPage("/app/dogfight-trainer");

  return <IframeLayout src="/dogfight-trainer" />;
}
