import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { isVisibleForCurrentUser } from "../utils/isVisibleForCurrentUser";
import { TASK_LIST_SELECT } from "./taskListSelect";

export const getTasks = cache(
  withTrace(
    "getTasks",
    async (status = "open", accepted = "all", created_by = "others") => {
      const authentication = await requireAuthentication();
      if (!(await authentication.authorize("task", "read"))) forbidden();

      let rows;

      if (status === "closed") {
        rows = await prisma.task.findMany({
          where: {
            deletedAt: null,
            OR: [
              {
                cancelledAt: {
                  not: null,
                },
              },
              {
                completedAt: {
                  not: null,
                },
              },
              {
                expiresAt: {
                  lt: new Date(),
                },
              },
            ],
            ...(accepted === "yes" && {
              assignments: {
                some: {
                  citizenId: authentication.session.entity?.id,
                },
              },
            }),
            ...(created_by === "me" && {
              createdById: authentication.session.entity?.id,
            }),
          },
          select: TASK_LIST_SELECT,
          orderBy: { createdAt: "desc" },
        });
      } else {
        rows = await prisma.task.findMany({
          where: {
            cancelledAt: null,
            deletedAt: null,
            completedAt: null,
            OR: [
              {
                expiresAt: {
                  gte: new Date(),
                },
              },
              {
                expiresAt: null,
              },
            ],
            ...(accepted === "yes" && {
              assignments: {
                some: {
                  citizenId: authentication.session.entity?.id,
                },
              },
            }),
            ...(created_by === "me" && {
              createdById: authentication.session.entity?.id,
            }),
          },
          select: TASK_LIST_SELECT,
          orderBy: {
            createdAt: "desc",
          },
        });
      }

      rows = (
        await Promise.all(
          rows.map(async (row) => {
            const include = await isVisibleForCurrentUser(row);

            return {
              include,
              row,
            };
          }),
        )
      )
        .filter(({ include }) => include)
        .map(({ row }) => row);

      return rows;
    },
  ),
);
