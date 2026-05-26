import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

type PatternStatus = "active" | "disabled" | "deleted";
type PatternSortField = "title" | "createdAt";
type PatternSortOrder = "asc" | "desc";

interface GetLogAnalyzerPatternsOptions {
  status?: PatternStatus;
  search?: string;
  sortBy?: PatternSortField;
  sortOrder?: PatternSortOrder;
}

const buildStatusWhereClause = (status: PatternStatus) => {
  if (status === "deleted")
    return {
      deletedAt: { not: null },
    };

  if (status === "disabled")
    return {
      deletedAt: null,
      disabledAt: { not: null },
    };

  return {
    deletedAt: null,
    disabledAt: null,
  };
};

export const getLogAnalyzerPatterns = cache(
  withTrace(
    "getLogAnalyzerPatterns",
    async ({
      status = "active",
      search,
      sortBy = "title",
      sortOrder = "asc",
    }: GetLogAnalyzerPatternsOptions = {}) => {
      const patterns = await prisma.logAnalyzerPattern.findMany({
        where: {
          ...buildStatusWhereClause(status),
          ...(search
            ? {
                title: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      });

      return patterns;
    },
  ),
);
