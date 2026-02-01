import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  getSilcBalanceOfAllCitizens,
  getSilcBalanceOfCurrentCitizen,
} from "@/modules/silc/queries";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { ProfitDistributionCycle } from "@prisma/client";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { getAuecPerSilc } from "./utils/getAuecPerSilc";
import { CyclePhase, getCurrentPhase } from "./utils/getCurrentPhase";
import { getPayoutState } from "./utils/getMyPayoutStatus";
import { getMyShare } from "./utils/getMyShare";
import { getOpenAuecPayout } from "./utils/getOpenAuecPayout";
import { getPaidAuec } from "./utils/getPaidAuec";
import { getTotalSilc } from "./utils/getTotalSilc";

export const getProfitDistributionCycles = cache(
  withTrace("getProfitDistributionCycles", async (status = "open") => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("profitDistributionCycle", "read")))
      forbidden();
    const hasProfitDistributionCycleManage = await authentication.authorize(
      "profitDistributionCycle",
      "manage",
    );

    const now = new Date();
    const cycles = await prisma.profitDistributionCycle.findMany({
      where: {
        ...(status === "open"
          ? {
              OR: [{ payoutEndedAt: null }, { payoutEndedAt: { gt: now } }],
            }
          : {
              payoutEndedAt: {
                lt: now,
              },
            }),
      },
      orderBy: {
        collectionEndedAt: "desc",
      },
      include: {
        participants: true,
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
              ? // @ts-expect-error
                getAuecPerSilc(cycle.auecProfit, totalSilc)
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

      // TODO: Remove cycle.participants if the user doesn't have the manage permission

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
