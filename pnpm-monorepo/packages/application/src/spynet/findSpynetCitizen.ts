import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireCitizenReadAccess } from "./citizenAccess.js";

const SPYNET_CITIZEN_SELECT = {
  id: true,
  handle: true,
  spectrumId: true,
  discordId: true,
  teamspeakId: true,
  citizenRecord: true,
  userId: true,
  communityMoniker: true,
  timezone: true,
  birthdayDay: true,
  birthdayMonth: true,
  roleAssignments: { select: { roleId: true, currentLevel: true } },
} as const satisfies Prisma.CitizenSelect;

export type SpynetCitizen = Prisma.CitizenGetPayload<{
  select: typeof SPYNET_CITIZEN_SELECT;
}>;

/**
 * The pages hide the values that the actor cannot read; the MCP server reads a
 * citizen with the `getCitizen` use case
 */
export const findSpynetCitizen = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  citizenId: string,
): Promise<SpynetCitizen | null> => {
  requireCitizenReadAccess(actor, citizenId);

  return context.prisma.citizen.findFirst({
    where: { id: citizenId, ...ACTIVE_CITIZEN_WHERE },
    select: SPYNET_CITIZEN_SELECT,
  });
};
