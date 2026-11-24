import { RoleAssignmentChangeType } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  ORGANIZATION_TIMEZONE,
  subtractCalendarDays,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import { createRoleAssignmentChanges } from "./roleAssignmentWrites.js";

export interface AutoAssignInactiveRolesOutput {
  readonly assignedCount: number;
}

interface Candidate {
  readonly citizenId: string;
  readonly citizenHandle: string | null;
  readonly roleId: string;
  readonly roleName: string;
}

/** A citizen without a login or without a known visit is skipped */
export const autoAssignInactiveRoles = (
  context: ApplicationContext,
): Promise<AutoAssignInactiveRolesOutput> =>
  withSpan(context, "autoAssignInactiveRoles", async () => {
    const now = context.now();
    const rolesWithAutoAssign = await context.prisma.role.findMany({
      where: {
        assignAfterInactiveDays: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        assignAfterInactiveDays: true,
      },
    });
    if (rolesWithAutoAssign.length <= 0) return { assignedCount: 0 };

    const candidates: Candidate[] = [];

    for (const role of rolesWithAutoAssign) {
      const inactiveThreshold = subtractCalendarDays(
        now,
        role.assignAfterInactiveDays!,
        ORGANIZATION_TIMEZONE,
      );

      const inactiveCitizens = await context.prisma.citizen.findMany({
        where: {
          user: {
            lastSeenAt: {
              lt: inactiveThreshold,
            },
          },
          roleAssignments: {
            none: {
              roleId: role.id,
            },
          },
        },
        select: {
          id: true,
          handle: true,
        },
      });

      for (const citizen of inactiveCitizens) {
        candidates.push({
          citizenId: citizen.id,
          citizenHandle: citizen.handle,
          roleId: role.id,
          roleName: role.name,
        });
      }
    }
    if (candidates.length <= 0) return { assignedCount: 0 };

    /**
     * A manual assignment at the same time wins: the history gets rows only
     * for the assignments that this run created.
     */
    const createdAssignments = await context.prisma.$transaction(
      async (transaction) => {
        const created = await transaction.roleAssignment.createManyAndReturn({
          data: candidates.map(({ citizenId, roleId }) => ({
            citizenId,
            roleId,
          })),
          skipDuplicates: true,
          select: {
            citizenId: true,
            roleId: true,
          },
        });

        await createRoleAssignmentChanges(
          transaction,
          created.map(({ citizenId, roleId }) => ({
            citizenId,
            roleId,
            type: RoleAssignmentChangeType.ADD,
          })),
          null,
        );

        return created;
      },
    );

    const assignedCandidates = candidates.filter((candidate) =>
      createdAssignments.some(
        (created) =>
          created.citizenId === candidate.citizenId &&
          created.roleId === candidate.roleId,
      ),
    );
    if (assignedCandidates.length <= 0) return { assignedCount: 0 };

    await context.audit.create(
      assignedCandidates.map((candidate) => ({
        type: AuditEventType.ROLE_AUTO_ASSIGNED,
        data: {
          citizenId: candidate.citizenId,
          citizenHandle: candidate.citizenHandle,
          roleId: candidate.roleId,
          roleName: candidate.roleName,
        },
        createdById: null,
      })),
    );

    return { assignedCount: assignedCandidates.length };
  });
