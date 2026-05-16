import { SilcSettingKey } from "@/generated/prisma/client";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { getRoleSalaries } from "../queries/getRoleSalaries";
import { getSilcSetting } from "../queries/getSilcSetting";
import { RoleSalariesClient } from "./RoleSalariesClient";

interface Props {
  readonly className?: string;
}

export const RoleSalaries = async ({ className }: Props) => {
  const [salaries, auecConversionRate] = await Promise.all([
    getRoleSalaries(),
    getSilcSetting(SilcSettingKey.AUEC_CONVERSION_RATE),
  ]);

  return (
    <Tile heading="Gehälter" className={clsx(className)}>
      <RoleSalariesClient
        initialSalaries={salaries}
        auecConversionRate={parseInt(auecConversionRate?.value || "0")}
      />
    </Tile>
  );
};
