import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import clsx from "clsx";
import { getAuecConversionRate } from "../queries/getAuecConversionRate";
import { getSilcBalanceOfAllCitizens } from "../queries/getSilcBalanceOfAllCitizens";

interface Props {
  readonly className?: string;
}

export const SilcStatistics = async ({ className }: Props) => {
  const [silcBalances, auecConversionRate] = await Promise.all([
    getSilcBalanceOfAllCitizens(),
    getAuecConversionRate(),
  ]);

  const totalSilc = silcBalances.reduce(
    (total, balance) => total + balance.silcBalance,
    0,
  );
  const totalAuec = totalSilc * auecConversionRate;

  return (
    <section className={clsx("flex flex-wrap gap-0.5", className)}>
      <StatisticTile label="SILC im Umlauf" className="flex-1">
        <ScrambleIn
          text={totalSilc.toLocaleString("de-de")}
          characters="1234567890."
        />
      </StatisticTile>

      <StatisticTile label="aUEC im Umlauf" className="flex-1">
        <ScrambleIn
          text={totalAuec.toLocaleString("de-de")}
          characters="1234567890."
        />
      </StatisticTile>
    </section>
  );
};
