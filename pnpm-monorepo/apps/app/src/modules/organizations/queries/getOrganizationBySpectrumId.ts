import { prisma } from "@/db";
import type { Organization } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";

export const getOrganizationBySpectrumId = withTrace(
  "getOrganizationBySpectrumId",
  async (spectrumId: Organization["spectrumId"]) => {
    return prisma.organization.findFirst({
      where: {
        spectrumId,
      },
    });
  },
);
