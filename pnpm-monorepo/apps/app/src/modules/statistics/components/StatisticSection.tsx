import { Tile } from "@/modules/common/components/Tile";
import type { StatisticChartData } from "@/modules/statistics/utils/chartData";
import clsx from "clsx";
import { StatisticChart } from "./StatisticChart";

interface Props {
  readonly className?: string;
  readonly title: string;
  readonly description: string;
  readonly chart: StatisticChartData;
}

export const StatisticSection = ({
  className,
  title,
  description,
  chart,
}: Props) => {
  return (
    <Tile heading={title} className={clsx(className)}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-neutral-300">
          {description}
        </p>

        {chart.hasData ? (
          <StatisticChart chart={chart} />
        ) : (
          <div className="rounded-primary border border-dashed border-white/10 p-8 text-center text-sm text-neutral-500">
            Keine Daten für den ausgewählten Zeitraum vorhanden.
          </div>
        )}
      </div>
    </Tile>
  );
};
