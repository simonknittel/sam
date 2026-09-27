import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { getAuecConversionRate } from "../queries/getAuecConversionRate";
import { getRoleSalaries } from "../queries/getRoleSalaries";
import { RoleSalariesClient } from "./RoleSalariesClient";

interface Props {
  readonly className?: string;
}

export const RoleSalaries = async ({ className }: Props) => {
  const [salaries, auecConversionRate] = await Promise.all([
    getRoleSalaries(),
    getAuecConversionRate(),
  ]);

  return (
    <Tile heading="Gehälter" className={clsx(className)}>
      <RoleSalariesClient
        initialSalaries={salaries}
        auecConversionRate={auecConversionRate}
      />
    </Tile>
  );
};
