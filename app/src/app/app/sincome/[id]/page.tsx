import { requireAuthenticationPage } from "@/modules/auth/server";
import { Button2 } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { PhaseCollection } from "@/modules/profit-distribution/components/PhaseCollection";
import { PhaseCompleted } from "@/modules/profit-distribution/components/PhaseCompleted";
import { PhasePayout } from "@/modules/profit-distribution/components/PhasePayout";
import { PhasePayoutPreparation } from "@/modules/profit-distribution/components/PhasePayoutPreparation";
import { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries";
import { CyclePhase } from "@/modules/profit-distribution/utils/getCurrentPhase";
import { notFound } from "next/navigation";
import { FaCog } from "react-icons/fa";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
    const cycleData = await getProfitDistributionCycleById(
      (await props.params).id,
    );
    if (!cycleData) notFound();

    return {
      title: `${cycleData.cycle.title} - SINcome - SILC`,
    };
  },
);

export default async function Page({ params }: PageProps<"/app/sincome/[id]">) {
  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableProfitDistribution)))
    notFound();

  const authentication = await requireAuthenticationPage("/app/sincome/[id]");
  await authentication.authorizePage("profitDistributionCycle", "read");

  const cycleData = await getProfitDistributionCycleById((await params).id);
  if (!cycleData) notFound();

  const [hasProfitDistributionCycleManage] = await Promise.all([
    authentication.authorize("profitDistributionCycle", "manage"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <div className="w-9 flex-initial" />

        <h1 className="text-2xl font-bold text-center flex-1">
          {cycleData.cycle.title}
        </h1>

        {hasProfitDistributionCycleManage && (
          <Button2
            as={Link}
            href={`/app/sincome/${cycleData.cycle.id}/management`}
            variant="secondary"
            className="w-9 flex-initial"
            title="Verwalten"
          >
            <FaCog />
          </Button2>
        )}
      </div>

      {cycleData.currentPhase >= CyclePhase.Completed && (
        <PhaseCompleted cycleData={cycleData} />
      )}

      {cycleData.currentPhase >= CyclePhase.Payout && (
        <PhasePayout cycleData={cycleData} />
      )}

      {cycleData.currentPhase >= CyclePhase.PayoutPreparation && (
        <PhasePayoutPreparation cycleData={cycleData} />
      )}

      <PhaseCollection cycleData={cycleData} />
    </div>
  );
}
