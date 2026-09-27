import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { hasReachedMaxLevel } from "@sam-monorepo/permissions";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * Every role with the number of citizens who get its salary, for the salary
 * editor's "citizens × SILC" preview. The same rule as the salary job: only
 * the direct assignments of citizens that are not deleted count, and a role
 * with levels counts only at its maximum level. The badge itself is rendered
 * from the roles context by id, so the role needs no more than its id and
 * its name for sorting.
 */
export const getRolesForSalaries = protectedProcedure.query(async () => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        maxLevel: true,
        assignments: {
          where: { citizen: ACTIVE_CITIZEN_WHERE },
          select: {
            currentLevel: true,
          },
        },
      },
    });

    return roles.map(({ id, name, maxLevel, assignments }) => ({
      role: { id, name },
      citizenCount: assignments.filter((assignment) =>
        hasReachedMaxLevel({
          currentLevel: assignment.currentLevel,
          role: { maxLevel },
        }),
      ).length,
    }));
  } catch (error) {
    log.error("Failed to fetch roles", {
      error: serializeError(error),
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch roles",
    });
  }
});
