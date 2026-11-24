import { SilcSettingKey } from "@sam-monorepo/database/browser";
import type { ApplicationContext } from "../context.js";
import {
  auecConversionRateSchema,
  DEFAULT_AUEC_CONVERSION_RATE,
} from "./auecConversionRate.js";

/** No permission check, see the README */
export const getAuecConversionRate = async (
  context: Pick<ApplicationContext, "prisma">,
): Promise<number> => {
  const setting = await context.prisma.silcSetting.findUnique({
    where: { key: SilcSettingKey.AUEC_CONVERSION_RATE },
    select: { value: true },
  });

  return setting
    ? auecConversionRateSchema.parse(setting.value)
    : DEFAULT_AUEC_CONVERSION_RATE;
};
