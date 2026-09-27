import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { getAuecConversionRate } from "../queries/getAuecConversionRate";
import { getSilcBalanceOfAllCitizens } from "../queries/getSilcBalanceOfAllCitizens";
import { AuecConversionRateSettingClient } from "./AuecConversionRateSettingClient";

interface Props {
  readonly className?: string;
}

export const AuecConversionRateSetting = async ({ className }: Props) => {
  const [conversionRate, silcBalances] = await Promise.all([
    getAuecConversionRate(),
    getSilcBalanceOfAllCitizens(),
  ]);

  const totalSilc = silcBalances.reduce(
    (total, balance) => total + balance.silcBalance,
    0,
  );

  return (
    <Tile heading="aUEC Umrechnungskurs" className={clsx(className)}>
      <AuecConversionRateSettingClient
        conversionRate={conversionRate}
        totalSilc={totalSilc}
      />
    </Tile>
  );
};
