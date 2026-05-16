import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getOrganizations = cache(
  withTrace("getOrganizations", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("organization", "read"))) forbidden();

    return prisma.organization.findMany();
  }),
);
