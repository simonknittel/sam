import { authorize } from "@/modules/auth/server";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
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
    /** A log that is not confirmed needs the permission to confirm it */
    const canConfirm = await authorize(ctx.session, input.type, "confirm");

    return ctx.prisma.citizenLog.findMany({
      where: {
        citizenId: input.citizenId,
        type: input.type,
        ...(canConfirm ? {} : { confirmed: ConfirmationStatus.CONFIRMED }),
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
