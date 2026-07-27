import { prisma } from "@/db";
import type { ProfitDistributionCycle } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { getSilcBalanceOfAllCitizens } from "@/modules/silc/queries/getSilcBalanceOfAllCitizens";
import { getSilcBalanceOfCurrentCitizen } from "@/modules/silc/queries/getSilcBalanceOfCurrentCitizen";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getAuecPerSilc } from "../utils/getAuecPerSilc";
import { CyclePhase, getCurrentPhase } from "../utils/getCurrentPhase";
import { getPayoutState } from "../utils/getMyPayoutStatus";
import { getMyShare } from "../utils/getMyShare";
import { getOpenAuecPayout } from "../utils/getOpenAuecPayout";
import { getPaidAuec } from "../utils/getPaidAuec";
import { getTotalSilc } from "../utils/getTotalSilc";

export const getProfitDistributionCycleById = cache(
  withTrace(
    "getProfitDistributionCycleById",
    async (id: ProfitDistributionCycle["id"]) => {
      const authentication = await requireAuthentication();
      const [hasProfitDistributionCycleRead, hasProfitDistributionCycleManage] =
        await Promise.all([
          authentication.authorize("profitDistributionCycle", "read"),
          authentication.authorize("profitDistributionCycle", "manage"),
        ]);
      if (!hasProfitDistributionCycleRead) forbidden();

      const cycle = await prisma.profitDistributionCycle.findUnique({
        where: {
          id,
        },
        include: {
          participants: {
            include: {
              citizen: {
                select: {
                  id: true,
                  handle: true,
                  silcBalance: true,
                },
              },
              disbursedBy: {
                select: {
                  id: true,
                  handle: true,
                },
              },
            },
          },
        },
      });
      if (!cycle) return null;

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
          ? // @ts-expect-error
            getAuecPerSilc(cycle.auecProfit, totalSilc)
          : null;
      const myShare =
        auecPerSilc !== null ? getMyShare(mySilcBalance, auecPerSilc) : null;
      const myPayoutState = getPayoutState(cycle, myParticipant);
      const allSilcBalances = hasProfitDistributionCycleManage
        ? (await getSilcBalanceOfAllCitizens()).filter(
            (citizen) => citizen.silcBalance > 0,
          )
        : [];
      const openAuecPayout =
        auecPerSilc !== null
          ? getOpenAuecPayout(cycle.participants, auecPerSilc)
          : null;
      const paidAuec =
        auecPerSilc !== null
          ? getPaidAuec(cycle.participants, auecPerSilc)
          : null;

      return {
        cycle,
        currentPhase,
        myParticipant,
        mySilcBalance,
        myShare,
        myPayoutState,
        allSilcBalances,
        totalSilc,
        openAuecPayout,
        paidAuec,
        auecPerSilc,
      };
    },
  ),
);
