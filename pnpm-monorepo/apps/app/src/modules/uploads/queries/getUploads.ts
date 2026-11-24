import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findUploadTablePage,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import type { UploadUsageType } from "@sam-monorepo/domain";
import { cache } from "react";

export const getUploads = cache(
  withTrace(
    "getUploads",
    async (
      usage?: UploadUsageType[] | null,
      from?: string | null,
      to?: string | null,
      query?: string | null,
      createdById?: string[] | null,
      cursor?: string | null,
      direction: CursorDirection = CursorDirection.Next,
    ) => {
      const { gte, lt } = getDateRangeFilter(from, to);

      try {
        return await findUploadTablePage(
          getApplicationContext(),
          await getRequestActor(),
          {
            usage,
            from: gte,
            to: lt,
            query,
            createdByIds: createdById,
            cursor,
          },
          { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
        );
      } catch (error) {
        return throwApplicationErrorForPage(error);
      }
    },
  ),
);
