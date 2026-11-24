import type { Prisma } from "@sam-monorepo/database/client";
import { getNoteMentionSpectrumIds } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export interface NoteMentionTargetsInput {
  readonly content: string;
}

const MENTIONED_CITIZEN_SELECT = {
  id: true,
  handle: true,
  spectrumId: true,
  deletedAt: true,
} as const satisfies Prisma.CitizenSelect;

const MENTIONED_ORGANIZATION_SELECT = {
  id: true,
  name: true,
  spectrumId: true,
  logo: true,
} as const satisfies Prisma.OrganizationSelect;

export interface NoteMentionTargets {
  /**
   * A deleted citizen can have the Spectrum ID of an active one, thus the
   * active citizen comes first and wins
   */
  readonly citizens: Prisma.CitizenGetPayload<{
    select: typeof MENTIONED_CITIZEN_SELECT;
  }>[];
  readonly organizations: Prisma.OrganizationGetPayload<{
    select: typeof MENTIONED_ORGANIZATION_SELECT;
  }>[];
}

export const findNoteMentionTargets = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  { content }: NoteMentionTargetsInput,
): Promise<NoteMentionTargets> => {
  requirePermission(actor, "citizen", "read");

  const { citizenSpectrumIds, organizationSpectrumIds } =
    getNoteMentionSpectrumIds(content);

  const [citizens, organizations] = await Promise.all([
    citizenSpectrumIds.length > 0
      ? context.prisma.citizen.findMany({
          where: { spectrumId: { in: citizenSpectrumIds } },
          orderBy: { deletedAt: { sort: "asc", nulls: "first" } },
          select: MENTIONED_CITIZEN_SELECT,
        })
      : [],
    organizationSpectrumIds.length > 0
      ? context.prisma.organization.findMany({
          where: { spectrumId: { in: organizationSpectrumIds } },
          select: MENTIONED_ORGANIZATION_SELECT,
        })
      : [],
  ]);

  return { citizens, organizations };
};
