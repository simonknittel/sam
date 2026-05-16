import { prisma } from "@/db";
import type { SilcSettingKey } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getSilcSetting = cache(
  withTrace("getSilcSetting", async (key: SilcSettingKey) => {
    return prisma.silcSetting.findUnique({
      where: {
        key,
      },
    });
  }),
);
