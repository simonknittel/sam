import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import { CITIZEN_REFERENCE_SELECT } from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { loadVisibleRoleIds } from "../roles/roleVisibility.js";
import { withSpan } from "../withSpan.js";
import type { PickableCitizen } from "./listAllCitizens.js";

export interface CitizensGroupedByVisibleRoles {
  readonly citizens: PickableCitizen[];
  /**
   * In the order of the visible roles (by name). The groups refer to the
   * citizens by id, because superjson (tRPC) sends a citizen again for each
   * group that refers to it. The client gets the role itself from the roles
   * context.
   */
  readonly roleGroups: {
    readonly roleId: string;
    readonly citizenIds: string[];
  }[];
}

/** Only the visibility of the roles limits the list */
export const listCitizensGroupedByVisibleRoles = (
  context: ApplicationContext,
  actor: Actor,
): Promise<CitizensGroupedByVisibleRoles> =>
  withSpan(context, "listCitizensGroupedByVisibleRoles", async () => {
    const visibleRoleIds = await loadVisibleRoleIds(context, actor);

    const citizens = await context.prisma.citizen.findMany({
      where: {
        ...ACTIVE_CITIZEN_WHERE,
        roleAssignments: { some: { roleId: { in: visibleRoleIds } } },
      },
      orderBy: { handle: "asc" },
      select: {
        ...CITIZEN_REFERENCE_SELECT,
        roleAssignments: {
          where: { roleId: { in: visibleRoleIds } },
          select: { roleId: true },
        },
      },
    });

    const citizenIdsByRoleId = new Map<string, string[]>();
    for (const citizen of citizens) {
      for (const { roleId } of citizen.roleAssignments) {
        const citizenIds = citizenIdsByRoleId.get(roleId);

        if (citizenIds) {
          citizenIds.push(citizen.id);
        } else {
          citizenIdsByRoleId.set(roleId, [citizen.id]);
        }
      }
    }

    return {
      citizens: citizens.map(({ id, handle, deletedAt }) => ({
        id,
        handle,
        deletedAt,
      })),
      roleGroups: visibleRoleIds.flatMap((roleId) => {
        const citizenIds = citizenIdsByRoleId.get(roleId);
        return citizenIds ? [{ roleId, citizenIds }] : [];
      }),
    };
  });
