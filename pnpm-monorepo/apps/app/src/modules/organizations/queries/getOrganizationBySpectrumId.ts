import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Organization } from "@sam-monorepo/database/client";

export const getOrganizationBySpectrumId = withTrace(
  "getOrganizationBySpectrumId",
  async (spectrumId: Organization["spectrumId"]) => {
    /** The one caller only checks for existence */
    return prisma.organization.findFirst({
      where: {
        spectrumId,
      },
      select: {
        id: true,
      },
    });
  },
);
