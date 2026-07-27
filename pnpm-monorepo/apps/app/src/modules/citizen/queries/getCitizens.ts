import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getCitizens = withTrace("getCitizens", async () => {
  const authentication = await requireAuthentication();
  await authentication.authorize("citizen", "read");

  return prisma.entity.findMany({
    include: {
      roleAssignments: true,
    },
  });
});
