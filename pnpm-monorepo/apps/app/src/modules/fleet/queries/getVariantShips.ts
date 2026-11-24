import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { CursorDirection } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import {
  findVariantShipPage,
  UnknownCursorBehavior,
} from "@sam-monorepo/application";
import { cache } from "react";

interface VariantShipsOptions {
  readonly cursor?: string | null;
  readonly direction?: CursorDirection;
}

export const getVariantShips = cache(
  async (
    variantId: string,
    { cursor, direction = CursorDirection.Next }: VariantShipsOptions = {},
  ) => {
    try {
      return await findVariantShipPage(
        getApplicationContext(),
        await getRequestActor(),
        { variantId, cursor },
        { direction, unknownCursor: UnknownCursorBehavior.FirstPage },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
