import { parseAsString, parseAsStringEnum } from "nuqs/server";

/** Which way a page move walks the (descending) result order. */
export enum CursorDirection {
  Next = "next",
  Prev = "prev",
}

export const cursorPaginationParsers = {
  cursor: parseAsString,
  direction: parseAsStringEnum(Object.values(CursorDirection)).withDefault(
    CursorDirection.Next,
  ),
};
