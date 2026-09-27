import { authorize } from "@/modules/auth/server";
import { getReadableCitizenLogWhere } from "@/modules/citizen/queries/getCitizenLogTablePage";
import * as z from "zod";
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
      ]), // TODO: Infer from CitizenLogType
      citizenId: z.string(),
    }),
  )
  .query(async ({ ctx, input }) => {
    /** The same rule as the Spynet log tables */
    const readableWhere = await getReadableCitizenLogWhere([input.type], {
      authorize: (resource, operation, attributes) =>
        authorize(ctx.session, resource, operation, attributes),
    });

    return ctx.prisma.citizenLog.findMany({
      where: {
        AND: [{ citizenId: input.citizenId }, readableWhere],
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        citizenId: true,
        type: true,
        content: true,
        createdAt: true,
        confirmed: true,
        confirmedBy: { select: { name: true } },
        submittedBy: { select: { name: true } },
      },
    });
  });
