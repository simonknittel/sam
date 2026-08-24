import { prisma } from "@/db";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { WikiRoleCitizen } from "../components/WikiRoleCitizensList";

/**
 * Resolves a role-members node's role into the citizens the current viewer
 * may see. Roles the viewer may not read resolve to nothing, so neither the
 * role nor its members leak.
 */
export const resolveWikiRoleCitizens = withTrace(
  "resolveWikiRoleCitizens",
  async (roleId: string): Promise<WikiRoleCitizen[]> => {
    const visibleRoles = await getVisibleRoles();
    const role = visibleRoles.find((candidate) => candidate.id === roleId);
    if (!role) return [];

    /**
     * Leveled roles only count once the max level is reached — the same
     * rule as resolveEffectiveRoles, so the block lists the citizens who
     * actually hold the role rather than everyone working towards it.
     * Deliberately direct assignments only: a role inherited through
     * another one is not "assigned" to anybody.
     */
    const citizens = await prisma.entity.findMany({
      where: {
        roleAssignments: {
          some: {
            roleId: role.id,
            ...(role.maxLevel
              ? { currentLevel: { gte: role.maxLevel } }
              : undefined),
          },
        },
      },
      select: { id: true, handle: true },
    });

    /** Handle-less citizens sort last — CitizenLink falls back to their id */
    return citizens.toSorted((a, b) => {
      if (a.handle && b.handle) return a.handle.localeCompare(b.handle);
      if (a.handle) return -1;
      if (b.handle) return 1;
      return a.id.localeCompare(b.id);
    });
  },
);
