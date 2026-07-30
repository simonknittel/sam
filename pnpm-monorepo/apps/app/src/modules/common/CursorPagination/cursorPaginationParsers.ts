import { parseAsString, parseAsStringLiteral } from "nuqs/server";

export const cursorPaginationParsers = {
  cursor: parseAsString,
  direction: parseAsStringLiteral(["next", "prev"]).withDefault("next"),
};
