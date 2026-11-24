import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { CitizenErrorMessage } from "../spynet/citizenErrors.js";

const SILC_BALANCE_ROW_SELECT = {
  ...CITIZEN_REFERENCE_SELECT,
  silcBalance: true,
  totalEarnedSilc: true,
} as const satisfies Prisma.CitizenSelect;

export type SilcBalanceRow = Prisma.CitizenGetPayload<{
  select: typeof SILC_BALANCE_ROW_SELECT;
}>;

export const findSilcBalanceRows = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<SilcBalanceRow[]> => {
  requirePermission(actor, "silcBalanceOfOtherCitizen", "read");

  return context.prisma.citizen.findMany({
    where: {
      ...ACTIVE_CITIZEN_WHERE,
      totalEarnedSilc: { not: { equals: 0 } },
    },
    select: SILC_BALANCE_ROW_SELECT,
    orderBy: { silcBalance: "desc" },
  });
};

export const getOwnSilcBalance = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
): Promise<number> => {
  const citizen = requireCitizen(actor);
  requirePermission(actor, "silcBalanceOfCurrentCitizen", "read");

  const ownCitizen = await context.prisma.citizen.findUnique({
    where: { id: citizen.id },
    select: { silcBalance: true },
  });
  if (!ownCitizen) throw new NotFoundError(CitizenErrorMessage.NotFound);

  return ownCitizen.silcBalance;
};
