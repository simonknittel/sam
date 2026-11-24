import { createLoader, type ParserMap } from "nuqs/server";
import { cursorPaginationParsers } from "./cursorPaginationParsers";

export const createCursorPaginationLoader = <Parsers extends ParserMap>(
  parsers: Parsers,
) => createLoader({ ...parsers, ...cursorPaginationParsers });
