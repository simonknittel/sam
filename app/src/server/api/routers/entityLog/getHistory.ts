import { authorize } from "@/modules/auth/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getHistory = protectedProcedure
  .input(
    z.object({
      type: z.union([
        z.literal("handle"),
        z.literal("discord-id"),
        z.literal("teamspeak-id"),
        z.literal("community-moniker"),
        z.literal("citizen-id"),
      ]), // TODO: Infer from EntityLogType
      entityId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const allLogs = await ctx.prisma.entityLog.findMany({
      where: {
        entityId: input.entityId,
        type: input.type,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        attributes: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            createdBy: true,
          },
        },
        submittedBy: true,
      },
    });

    const filteredLogs = (
      await Promise.all(
        allLogs.map(async (log) => {
          const confirmed = log.attributes.find(
            (attribute) => attribute.key === "confirmed",
          );

          const include =
            confirmed?.value === "confirmed"
              ? true
              : await authorize(ctx.session, input.type, "confirm");

          return {
            log,
            include,
          };
        }),
      )
    )
      .filter(({ include }) => include)
      .map(({ log }) => log);

    return filteredLogs;
  });
