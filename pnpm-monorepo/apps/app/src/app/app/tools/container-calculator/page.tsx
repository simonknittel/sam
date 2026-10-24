import { requireAuthenticationPage } from "@/modules/auth/server";
import { ContainerCalculator } from "@/modules/container-calculator/components/ContainerCalculator";

export default async function Page() {
  await requireAuthenticationPage("/app/tools/container-calculator");

  return <ContainerCalculator />;
}
