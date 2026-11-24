import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  findShipChangePage,
  ShipChangeFilter,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { cache } from "react";

export type { ShipChangeRow } from "@sam-monorepo/application";

interface ShipChangesOptions {
  readonly changeType?: ShipChangeFilter;
  readonly cursor?: string | null;
  readonly direction?: CursorDirection;
}

export const getShipChanges = cache(
  async ({
    changeType = ShipChangeFilter.Both,
    cursor,
    direction = CursorDirection.Next,
  }: ShipChangesOptions = {}) => {
    try {
      return await findShipChangePage(
        getApplicationContext(),
        await getRequestActor(),
        { changeType, cursor },
        { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
