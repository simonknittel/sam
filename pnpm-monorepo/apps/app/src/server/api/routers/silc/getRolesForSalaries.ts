import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { protectedProcedure } from "../../trpc";

/**
 * Every role with the number of citizens holding it, for the salary
 * editor's "citizens × SILC" preview. The badge itself is rendered from the
 * roles context by id, so the role needs no more than its id and its name
 * for sorting.
 */
export const getRolesForSalaries = protectedProcedure.query(async () => {
  try {
    const [allRoles, assignmentCounts] = await Promise.all([
      prisma.role.findMany({
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.roleAssignment.groupBy({
        by: ["roleId"],
        _count: true,
      }),
    ]);

    const citizenCountByRoleId = new Map(
      assignmentCounts.map((group) => [group.roleId, group._count]),
    );

    return allRoles.map((role) => ({
      role,
      citizenCount: citizenCountByRoleId.get(role.id) ?? 0,
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
