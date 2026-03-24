import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getAuditEventCreators = cache(
  withTrace("getAuditEventCreators", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("systemLog", "read"))) forbidden();

    const creators = await prisma.auditEvent.findMany({
      where: {
        createdById: {
          not: null,
        },
      },
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

    return creators
      .map((e) => e.createdBy)
      .filter((creator): creator is NonNullable<typeof creator> => !!creator);
  }),
);
