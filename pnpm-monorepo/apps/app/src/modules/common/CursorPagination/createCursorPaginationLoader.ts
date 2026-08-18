import { createLoader, type ParserMap } from "nuqs/server";
import { cursorPaginationParsers } from "./cursorPaginationParsers";

/**
 * A page's own search param parsers plus the cursor pagination ones every
 * paginated table needs, so no page has to remember to spread them itself.
 */
export const createCursorPaginationLoader = <Parsers extends ParserMap>(
  parsers: Parsers,
) => createLoader({ ...parsers, ...cursorPaginationParsers });
