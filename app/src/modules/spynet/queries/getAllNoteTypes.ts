import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

export const getAllNoteTypes = cache(
  withTrace("getAllNoteTypes", async () => {
    return prisma.noteType.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }),
);
