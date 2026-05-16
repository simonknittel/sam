import { prisma } from "@/db";
import { type Variant } from "@/generated/prisma/client";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getVariantById = cache(
  withTrace("getVariantById", async (id: Variant["id"]) => {
    await requireAuthentication();

    return prisma.variant.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }),
);
