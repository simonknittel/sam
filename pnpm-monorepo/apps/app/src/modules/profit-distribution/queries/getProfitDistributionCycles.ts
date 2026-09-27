import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { getSilcBalanceOfCurrentCitizen } from "@/modules/silc/queries/getSilcBalanceOfCurrentCitizen";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  CYCLE_PHASE_WHERE,
  CyclePhase,
  getAuecPerSilc,
  getCurrentPhase,
  getTotalSilc,
} from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getPayoutState } from "../utils/getMyPayoutStatus";
import { getMyShare } from "../utils/getMyShare";

export const getProfitDistributionCycles = cache(
  withTrace("getProfitDistributionCycles", async (status = "open") => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("profitDistributionCycle", "read")))
      forbidden();
    const hasProfitDistributionCycleManage = await authentication.authorize(
      "profitDistributionCycle",
      "manage",
    );

    const completedWhere = CYCLE_PHASE_WHERE[CyclePhase.Completed];
    const cycles = await prisma.profitDistributionCycle.findMany({
      where: status === "open" ? { NOT: completedWhere } : completedWhere,
      orderBy: {
        collectionEndsAt: "desc",
      },
      include: {
        participants: {
          select: {
            citizenId: true,
            silcBalanceSnapshot: true,
            cededAt: true,
            acceptedAt: true,
            disbursedAt: true,
          },
        },
      },
    });

    let currentCollectionCycle: string | null = null;

    return Promise.all(
      cycles
        .filter((cycle) => {
          if (status !== "open") return true;

          if (hasProfitDistributionCycleManage) return true;

          const currentPhase = getCurrentPhase(cycle);

          if (currentPhase === CyclePhase.Collection) {
            if (!currentCollectionCycle) {
              currentCollectionCycle = cycle.id;
              return true;
            }
            return false;
          }

          if (
            [CyclePhase.PayoutPreparation, CyclePhase.Payout].includes(
              currentPhase,
            )
          )
            return true;

          return false;
        })
        .map(async (cycle) => {
          const currentPhase = getCurrentPhase(cycle);
          const myParticipant = cycle.participants.find(
            (participant) =>
              participant.citizenId === authentication.session.entity!.id,
          );
          const mySilcBalance =
            currentPhase === CyclePhase.Collection
              ? await getSilcBalanceOfCurrentCitizen()
              : myParticipant?.silcBalanceSnapshot || 0;
          const totalSilc = getTotalSilc(cycle.participants);
          const auecPerSilc =
            cycle.auecProfit !== null
              ? getAuecPerSilc(cycle.auecProfit, totalSilc)
              : 0;
          const myShare = getMyShare(mySilcBalance, auecPerSilc);
          const myPayoutState = getPayoutState(cycle, myParticipant);

          // TODO: Remove cycle.participants if the user doesn't have the manage permission

          return {
            cycle,
            currentPhase,
            myParticipant,
            mySilcBalance,
            myShare,
            myPayoutState,
          };
        }),
    );
  }),
);
