import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { SilcSettingKey } from "@sam-monorepo/database/client";
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
