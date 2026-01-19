import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { getRoles } from "@/modules/roles/queries";
import type { Role, Upload } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { serializeError } from "serialize-error";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const silcRouter = createTRPCRouter({
  getRolesForSalaries: protectedProcedure.query(async () => {
    try {
      const allCitizens = await prisma.entity.findMany({
        where: {
          roleAssignments: {
            some: {},
          },
        },
        include: {
          roleAssignments: true,
        },
      });

      const citizensGroupedByRole = new Map<
        string,
        {
          role: Role & {
            icon: Upload | null;
          };
          citizenCount: number;
        }
      >();

      const allRoles = await getRoles();

      for (const role of allRoles) {
        citizensGroupedByRole.set(role.id, {
          role,
          citizenCount: 0,
        });
      }

      for (const citizen of allCitizens) {
        const citizenRoleIds = citizen.roleAssignments.map(
          (assignment) => assignment.roleId,
        );
        for (const citizenRoleId of citizenRoleIds) {
          const role = allRoles.find((r) => r.id === citizenRoleId);
          if (!role) continue;
          citizensGroupedByRole.get(role.id)!.citizenCount += 1;
        }
      }

      return Array.from(citizensGroupedByRole.values());
    } catch (error) {
      log.error("Failed to fetch roles", {
        error: serializeError(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch roles",
      });
    }
  }),
});
