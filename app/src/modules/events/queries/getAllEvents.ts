import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";

export const getAllEvents = cache(
  withTrace("getAllEvents", async () => {
    const authentication = await requireAuthentication();
    if (!(await authentication.authorize("event", "read"))) forbidden();

    return prisma.event.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }),
);
