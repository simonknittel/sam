import clsx from "clsx";
import { createLoader, parseAsString, type SearchParams } from "nuqs/server";
import { getProfitDistributionCycles } from "../queries";
import { ProfitDistributionCycleExcerpt } from "./ProfitDistributionCycleExcerpt";

const loadSearchParams = createLoader({
  status: parseAsString.withDefault("open"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const ProfitDistributionCycleExcerptList = async ({
  className,
  searchParams,
}: Props) => {
  const { status } = await loadSearchParams(searchParams);

  const profitDistributionCycles = await getProfitDistributionCycles(status);

  return (
    <div className={clsx("flex flex-col gap-[2px]", className)}>
      {profitDistributionCycles.length > 0 ? (
        profitDistributionCycles.map((cycleData) => (
          <ProfitDistributionCycleExcerpt
            key={cycleData.cycle.id}
            cycleData={cycleData}
          />
        ))
      ) : (
        <div className="rounded-primary bg-secondary p-4 text-center">
          <p>Keine SINcome-Zeiträume gefunden</p>
        </div>
      )}
    </div>
  );
};
