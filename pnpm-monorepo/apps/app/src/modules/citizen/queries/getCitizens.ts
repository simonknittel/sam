import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";

const requireCitizenRead = async () => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("citizen", "read")))
    throw new Error("Forbidden");
};

/**
 * Every citizen as the pickers offer them: the combobox searches the handle
 * and submits the id, and the wiki's mention suggestions do the same. The
 * list is unbounded and crosses to the browser through tRPC, so it carries
 * nothing else.
 */
export const getCitizens = withTrace("getCitizens", async () => {
  await requireCitizenRead();

  return prisma.citizen.findMany({
    select: {
      id: true,
      handle: true,
    },
  });
});

/**
 * Every citizen with the columns the citizens table renders, filters and
 * sorts by. The time of the last visit comes from the login of the citizen
 * and only with the permission to read it.
 */
export const getCitizensForTable = withTrace(
  "getCitizensForTable",
  async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("citizen", "read")))
      throw new Error("Forbidden");
    const canReadLastSeenAt = await authentication.authorize(
      "lastSeen",
      "read",
    );

    const citizens = await prisma.citizen.findMany({
      select: {
        id: true,
        handle: true,
        discordId: true,
        teamspeakId: true,
        spectrumId: true,
        createdAt: true,
        roleAssignments: {
          select: {
            roleId: true,
            currentLevel: true,
          },
        },
        user: {
          select: {
            lastSeenAt: true,
          },
        },
      },
    });

    return citizens.map(({ user, ...entity }) => ({
      entity,
      lastSeenAt: canReadLastSeenAt ? (user?.lastSeenAt ?? null) : null,
    }));
  },
);
