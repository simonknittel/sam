import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

/**
 * Everyone who has ever uploaded something, for the author filter. Manager
 * scope only — without the permission the table shows a single author
 * anyway, so there is nothing to filter by.
 */
export const getUploadAuthors = cache(
  withTrace("getUploadAuthors", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("upload", "manage"))) forbidden();

    const authors = await prisma.upload.findMany({
      select: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      distinct: ["createdById"],
      orderBy: {
        createdBy: {
          name: "asc",
        },
      },
    });

    return authors.map((upload) => upload.createdBy);
  }),
);
