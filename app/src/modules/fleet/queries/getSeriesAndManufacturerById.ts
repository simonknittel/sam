import { prisma } from "@/db";
import { type Manufacturer, type Series } from "@/generated/prisma/client";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getSeriesAndManufacturerById = cache(
  withTrace(
    "getSeriesAndManufacturerById",
    async (seriesId: Series["id"], manufacturerId: Manufacturer["id"]) => {
      return Promise.all([
        prisma.series.findUnique({
          where: {
            id: seriesId,
          },
        }),

        prisma.manufacturer.findUnique({
          where: {
            id: manufacturerId,
          },
        }),
      ]);
    },
  ),
);
