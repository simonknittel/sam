import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { forbidden } from "next/navigation";
import { cache } from "react";

/**
 * Every citizen who has ever uploaded something, for the author filter.
 * Manager scope only — without the permission the table shows a single
 * author anyway, so there is nothing to filter by. A deleted citizen is not
 * a filter option, like in all other pickers.
 */
export const getUploadAuthors = cache(
  withTrace("getUploadAuthors", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("upload", "manage"))) forbidden();

    return prisma.citizen.findMany({
      where: {
        ...ACTIVE_CITIZEN_WHERE,
        uploads: {
          some: {},
        },
      },
      select: {
        id: true,
        handle: true,
      },
      orderBy: {
        handle: "asc",
      },
    });
  }),
);
