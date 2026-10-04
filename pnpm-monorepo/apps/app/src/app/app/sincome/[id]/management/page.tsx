import { requireAuthenticationPage } from "@/modules/auth/server";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { PhaseManagementCollection } from "@/modules/profit-distribution/components/PhaseManagementCollection";
import { PhaseManagementCompleted } from "@/modules/profit-distribution/components/PhaseManagementCompleted";
import { PhaseManagementPayout } from "@/modules/profit-distribution/components/PhaseManagementPayout";
import { PhaseManagementPayoutPreparation } from "@/modules/profit-distribution/components/PhaseManagementPayoutPreparation";
import { getProfitDistributionCycleById } from "@/modules/profit-distribution/queries/getProfitDistributionCycleById";
import { CyclePhase } from "@sam-monorepo/domain";
import { notFound } from "next/navigation";
import { FaChevronLeft } from "react-icons/fa";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/sincome/[id]/management">) => {
    const cycleData = await getProfitDistributionCycleById(
      (await props.params).id,
    );
    if (!cycleData) notFound();

    return {
      title: `${cycleData.cycle.title}`,
    };
  },
);

export default async function Page({
  params,
}: PageProps<"/app/sincome/[id]/management">) {
  const authentication = await requireAuthenticationPage(
    "/app/sincome/[id]/management",
  );
  await authentication.authorizePage("profitDistributionCycle", "manage");

  const cycleData = await getProfitDistributionCycleById((await params).id);
  if (!cycleData) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <div className="w-9 flex-initial" />

        <h1 className="flex-1 text-center font-mono text-2xl font-bold uppercase">
          {cycleData.cycle.title}
        </h1>
        {/* TODO: Implement edit button */}

        <Button2
          as={Link}
          href={`/app/sincome/${cycleData.cycle.id}`}
          variant={Button2Variant.Secondary}
          className="w-9 flex-initial"
          title="Zurück"
        >
          <FaChevronLeft />
        </Button2>
      </div>

      <p className="text-center text-sm text-neutral-500">Verwaltung</p>

      {cycleData.currentPhase >= CyclePhase.Completed && (
        <PhaseManagementCompleted cycleData={cycleData} />
      )}

      {cycleData.currentPhase >= CyclePhase.Payout && (
        <PhaseManagementPayout cycleData={cycleData} />
      )}

      {cycleData.currentPhase >= CyclePhase.PayoutPreparation && (
        <PhaseManagementPayoutPreparation cycleData={cycleData} />
      )}

      <PhaseManagementCollection cycleData={cycleData} />
    </div>
  );
}
