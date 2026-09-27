import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { SilcSettingKey } from "@sam-monorepo/database/client";
import { cache } from "react";
import {
  auecConversionRateSchema,
  DEFAULT_AUEC_CONVERSION_RATE,
} from "../utils/auecConversionRate";

export const getAuecConversionRate = cache(
  withTrace("getAuecConversionRate", async () => {
    const setting = await prisma.silcSetting.findUnique({
      where: {
        key: SilcSettingKey.AUEC_CONVERSION_RATE,
      },
      select: {
        value: true,
      },
    });

    return setting
      ? auecConversionRateSchema.parse(setting.value)
      : DEFAULT_AUEC_CONVERSION_RATE;
  }),
);
