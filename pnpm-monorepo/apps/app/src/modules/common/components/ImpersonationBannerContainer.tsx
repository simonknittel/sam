import { prisma } from "@/db";
import { cookies } from "next/headers";
import ImpersonationBanner from "./ImpersonationBanner";

async function getImpersonatedRoles() {
  const cookieStore = await cookies();
  const impersonate = cookieStore.get("impersonate");

  if (!impersonate) return null;

  return prisma.role.findMany({
    where: { id: { in: impersonate.value.split(",") } },
  });
}

const ImpersonationBannerContainer = async () => {
  const impersonatedRoles = await getImpersonatedRoles();

  if (!impersonatedRoles) return null;

  return <ImpersonationBanner roles={impersonatedRoles} />;
};

export default ImpersonationBannerContainer;
