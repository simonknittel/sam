import { prisma } from "@/db";
import type { Organization } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getOrganizationById = cache(
  withTrace("getOrganizationById", async (id: Organization["id"]) => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("organization", "read"))) forbidden();

    return prisma.organization.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        spectrumId: true,
        name: true,
        logo: true,
      },
    });
  }),
);
