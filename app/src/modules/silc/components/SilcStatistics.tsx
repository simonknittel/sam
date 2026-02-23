import { ScrambleIn } from "@/modules/common/components/ScrambleIn";
import { StatisticTile } from "@/modules/common/components/StatisticTile";
import { SilcSettingKey } from "@prisma/client";
import clsx from "clsx";
import { getSilcBalanceOfAllCitizens, getSilcSetting } from "../queries";

interface Props {
  readonly className?: string;
}

export const SilcStatistics = async ({ className }: Props) => {
  const [silcBalances, auecConversionRateSetting] = await Promise.all([
    getSilcBalanceOfAllCitizens(),
    getSilcSetting(SilcSettingKey.AUEC_CONVERSION_RATE),
  ]);

  const totalSilc = silcBalances.reduce(
    (total, balance) => total + balance.silcBalance,
    0,
  );
  const totalAuec =
    totalSilc * Number.parseInt(auecConversionRateSetting?.value || "1", 10);

  return (
    <section className={clsx("flex flex-wrap gap-[2px]", className)}>
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
