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

  return prisma.entity.findMany({
    select: {
      id: true,
      handle: true,
    },
  });
});

/**
 * Every citizen with the columns the citizens table renders, filters and
 * sorts by.
 */
export const getCitizensForTable = withTrace(
  "getCitizensForTable",
  async () => {
    await requireCitizenRead();

    return prisma.entity.findMany({
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
      },
    });
  },
);
